import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  const globalCandidates = [
    '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js',
    '/usr/local/lib/node_modules/typescript/lib/typescript.js',
  ];
  for (const candidate of globalCandidates) {
    if (fs.existsSync(candidate)) { ts = require(candidate); break; }
  }
}
if (!ts) {
  console.error('TypeScript is not installed. Run npm.cmd install first.');
  process.exit(2);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'repair-source'].includes(entry.name)) return [];
      return walk(full);
    }
    return /\.(tsx?|mts|cts)$/.test(entry.name) ? [full] : [];
  });
}

const files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'tests')), ...walk(path.join(root, 'scripts')).filter(file => file.endsWith('.ts'))];
const problems = [];
const sourceTexts = new Map(files.map(file => [path.resolve(file), fs.readFileSync(file, 'utf8')]));
const asts = new Map();
for (const [file, source] of sourceTexts) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  asts.set(file, ast);
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
      verbatimModuleSyntax: true,
    },
  });
  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    const pos = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    problems.push(`${path.relative(root, file)}${pos ? `:${pos.line + 1}:${pos.character + 1}` : ''}: ${message}`);
  }
}

function resolveLocalModule(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.mts`, `${base}.cts`, `${base}.js`, `${base}.jsx`, `${base}.css`, `${base}.json`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}
function exportedNames(file, seen = new Set()) {
  if (seen.has(file)) return new Set();
  seen.add(file);
  const ast = asts.get(file);
  if (!ast) return new Set();
  const names = new Set();
  for (const statement of ast.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) ?? [] : [];
    const isExported = modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (isExported) {
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) && statement.name) names.add(statement.name.text);
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) names.add('default');
    }
    if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) names.add(element.name.text);
      } else if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.startsWith('.')) {
        const target = resolveLocalModule(file, statement.moduleSpecifier.text);
        if (target) for (const name of exportedNames(target, seen)) names.add(name);
      }
    }
    if (ts.isExportAssignment(statement)) names.add('default');
  }
  return names;
}

for (const [file, ast] of asts) {
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith('.')) continue;
    const target = resolveLocalModule(file, specifier);
    const pos = ast.getLineAndCharacterOfPosition(statement.getStart(ast));
    if (!target) {
      problems.push(`${path.relative(root, file)}:${pos.line + 1}: unresolved local import '${specifier}'`);
      continue;
    }
    if (!asts.has(target) || !statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings)) continue;
    const exports = exportedNames(target);
    for (const item of statement.importClause.namedBindings.elements) {
      const imported = item.propertyName?.text ?? item.name.text;
      if (imported === 'type') continue;
      if (!exports.has(imported)) problems.push(`${path.relative(root, file)}:${pos.line + 1}: '${imported}' is not exported by '${path.relative(root, target)}'`);
    }
  }
}

if (problems.length) {
  console.error(`Source validation FAILED (${problems.length} issues):`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`PASS: TypeScript/TSX syntax transpilation and local-import/export check (${files.length} source/test files).`);
console.log('NOTE: this is a source consistency check, not a substitute for the full `tsc -b` typecheck after npm dependencies are installed.');
