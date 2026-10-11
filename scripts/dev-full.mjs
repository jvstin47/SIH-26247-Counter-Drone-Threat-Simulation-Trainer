import { spawn } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const api = spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit', env: { ...process.env, AID_C2S_PORT: process.env.AID_C2S_PORT || '4177' } });
const vite = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], { stdio: 'inherit', shell: isWindows });
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of [vite, api]) if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 150);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
vite.on('error', error => { console.error('Could not start Vite:', error); stop(1); });
api.on('error', error => console.error('Optional local API could not start:', error));
vite.on('exit', code => stop(code ?? 0));
