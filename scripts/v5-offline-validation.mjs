import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch {
  const candidates = [
    '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js',
    '/usr/local/lib/node_modules/typescript/lib/typescript.js',
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) { ts = require(candidate); break; }
}
if (!ts) {
  console.error('TypeScript compiler is unavailable. Run npm.cmd install first.');
  process.exit(2);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aid-c2s-v5-core-'));
const simulationDir = path.join(temp, 'simulation');
fs.mkdirSync(simulationDir, { recursive: true });
const sourceDir = path.join(root, 'src', 'simulation');
const modules = ['rng', 'scenarios', 'validation', 'tracking', 'sensorFusion', 'scoring', 'adaptive', 'localMl'];
for (const name of modules) {
  const src = fs.readFileSync(path.join(sourceDir, `${name}.ts`), 'utf8');
  const result = ts.transpileModule(src, {
    fileName: `${name}.ts`, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, strict: true },
  });
  const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${name}.ts transpiles without syntax errors`);
  // Node's ESM loader requires concrete extensions for the emitted pure-module test bundle.
  const code = result.outputText.replace(/(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g, (whole, before, spec, after) => {
    const withExtension = /\.(mjs|js|json)$/.test(spec) ? spec : `${spec}.mjs`;
    return `${before}${withExtension}${after}`;
  });
  fs.writeFileSync(path.join(simulationDir, `${name}.mjs`), code);
}
const importModule = async name => import(pathToFileURL(path.join(simulationDir, `${name}.mjs`)).href);
const { SeededRng } = await importModule('rng');
const { generateScenario, spawnEntities, showcaseScenarios } = await importModule('scenarios');
const { validateScenario } = await importModule('validation');
const { TrackManager } = await importModule('tracking');
const { SensorFusion } = await importModule('sensorFusion');
const { scoreSession, expectedDecisionFor } = await importModule('scoring');
const { nextDifficulty, recommendScenario } = await importModule('adaptive');
const { predictSyntheticEntity, predictSyntheticTrack, localModelStatus } = await importModule('localMl');
const { test } = await import('node:test');

const observation = (id, t, x, source = 'RADAR_SYNTH', entityId = 'E-01') => ({
  id, entityId, source, t, x, y: 20, z: 4, confidence: .8, noise: .1, health: 1, occluded: false, quality: 'HIGH',
});
const entity = (id, category, detectedAt = 100) => ({
  id, category, state: 'DETECTED', x: 0, y: 20, z: 0, vx: .8, vy: 0, vz: .4,
  ax: .01, az: .01, signature: .5, spawnT: 0, detectedAt,
});
const makeTrack = (entityId, classification, decision, confidence = .9) => ({
  id: `T-${entityId}`, entityId, state: 'RESOLVED', confidence: .9,
  x: 0, y: 20, z: 0, vx: 0, vy: 0, vz: 0, lastSeen: 2000, ageMs: 0,
  sources: ['RADAR_SYNTH'],
  history: Array.from({ length: 20 }, (_, index) => ({ t: index * 100, x: 0, y: 20, z: 0, confidence: .9 })),
  traineeClassification: classification, traineeConfidence: confidence, decision,
});
const fakeSession = score => ({
  id: `session-${score}`, profileId: 'profile-default', startedAt: 1, endedAt: 2,
  scenario: generateScenario(1), events: [],
  score: { total: score, detection: score, classification: score, decision: score, confidenceCalibration: score, trackContinuity: score, completion: 100, falsePositivePenalty: 0 },
  mistakes: [], strengths: [], trackCount: 4, mediaProfile: 'AERIAL_DAY', durationMs: 2500,
});
let passed = 0;
async function check(name, fn) {
  await test(name, async () => { await fn(); passed++; });
}

await check('seeded PRNG repeats an identical stream', () => {
  const a = new SeededRng(123), b = new SeededRng(123);
  assert.deepEqual(Array.from({ length: 30 }, () => a.next()), Array.from({ length: 30 }, () => b.next()));
});
await check('scenario and entity generation are deterministic for equal seeds', () => {
  const a = generateScenario(48152), b = generateScenario(48152);
  assert.deepEqual(a, b);
  assert.deepEqual(spawnEntities(a), spawnEntities(b));
});
await check('different seeds produce different world entities', () => {
  assert.notDeepEqual(spawnEntities(generateScenario(11)), spawnEntities(generateScenario(12)));
});
await check('showcase catalogue contains at least 20 unique seeded scenarios', () => {
  assert.ok(showcaseScenarios.length >= 20);
  assert.equal(new Set(showcaseScenarios.map(s => s.id)).size, showcaseScenarios.length);
  assert.equal(new Set(showcaseScenarios.map(s => s.seed)).size, showcaseScenarios.length);
});
await check('scenario validation normalizes seed and rejects dangerous bounds', () => {
  assert.equal(validateScenario({ ...generateScenario(42), seed: 0 }).seed, 0);
  assert.throws(() => validateScenario({ ...generateScenario(42), entityCount: 500 }), /Entity count/);
  assert.throws(() => validateScenario({ ...generateScenario(42), environment: 'NOT_A_VALID_ENVIRONMENT' }), /environment/);
  assert.throws(() => validateScenario({ ...generateScenario(42), difficulty: 2 }), /difficulty/);
});
await check('sensor fusion repeats the same observation stream for the same seed', () => {
  const scenario = generateScenario(421, { entityCount: 5, backgroundActivity: .8 });
  const entities = spawnEntities(scenario);
  assert.deepEqual(new SensorFusion(scenario.seed).observe(entities, scenario, 500), new SensorFusion(scenario.seed).observe(entities, scenario, 500));
});
await check('synthetic ambiguous returns are rate-limited and do not flood per frame', () => {
  const scenario = generateScenario(421, { entityCount: 5, backgroundActivity: .95 });
  const entities = spawnEntities(scenario), fusion = new SensorFusion(scenario.seed);
  let ghosts = 0;
  for (let t = 50; t <= 8900; t += 50) ghosts += fusion.observe(entities, scenario, t).filter(o => o.entityId === null).length;
  assert.ok(ghosts <= 5, `expected <=5 ghosts, got ${ghosts}`);
});
await check('same-entity sensor observations form one fused track with history', () => {
  const tracker = new TrackManager();
  const first = tracker.update([observation('o1', 50, 3)], 50, 50, .4);
  const second = tracker.update([observation('o2', 100, 3.5, 'VISUAL'), observation('o3', 100, 3.4, 'RF_LIKE')], 50, 100, .4);
  assert.equal(first.length, 1); assert.equal(second.length, 1);
  assert.equal(second[0].history.length, 2, 'history records one fused point per update tick');
  assert.ok(second[0].sources.includes('VISUAL') && second[0].sources.includes('RF_LIKE'));
});
await check('noisy sensor signature propagates into the track and is used by local perception', () => {
  const scenario = generateScenario(181, { entityCount: 2, ambiguity: .65 });
  const entities = spawnEntities(scenario);
  const observations = new SensorFusion(scenario.seed).observe(entities, scenario, 50);
  assert.ok(observations.some(o => Number.isFinite(o.signature) && o.signature >= 0 && o.signature <= 1));
  const tracker = new TrackManager();
  const tracks = tracker.update(observations, 50, 50, scenario.trackingDifficulty);
  assert.ok(tracks.some(t => Number.isFinite(t.signature) && t.signature >= 0 && t.signature <= 1));
});

await check('ghost and real entity tracks cannot cross-associate even when close', () => {
  const tracker = new TrackManager();
  const [ghost] = tracker.update([observation('ghost', 50, 60, 'RADAR_SYNTH', null)], 50, 50, .4);
  const tracks = tracker.update([observation('real', 100, 60.4, 'VISUAL', 'E-09')], 50, 100, .4);
  assert.equal(tracker.get(ghost.id).entityId, null);
  assert.equal(tracks.length, 2);
  assert.ok(tracks.some(t => t.entityId === 'E-09'));
});
await check('nearby distinct ground-truth entities cannot merge', () => {
  const tracker = new TrackManager();
  const tracks = tracker.update([observation('e1', 50, 0, 'RADAR_SYNTH', 'E-01'), observation('e2', 50, .2, 'RADAR_SYNTH', 'E-02')], 50, 50, .9);
  assert.equal(tracks.length, 2);
  assert.deepEqual(new Set(tracks.map(t => t.entityId)), new Set(['E-01', 'E-02']));
});
await check('classification/resolution lifecycle remains stable under future observations', () => {
  const tracker = new TrackManager();
  const [track] = tracker.update([observation('o1', 50, 10)], 50, 50, .2);
  tracker.setTraineeClassification(track.id, 'BENIGN', .9);
  tracker.update([observation('o2', 100, 10.2)], 50, 100, .2);
  assert.equal(tracker.get(track.id).state, 'CLASSIFIED');
  tracker.setDecision(track.id, 'RESOLVE');
  tracker.update([observation('o3', 150, 10.4)], 50, 150, .2);
  assert.equal(tracker.get(track.id).state, 'RESOLVED');
});
await check('stale tracks become LOST and return as REACQUIRED when seen again', () => {
  const tracker = new TrackManager();
  const [track] = tracker.update([observation('o1', 50, 0)], 50, 50, .2);
  tracker.update([], 6000, 6050, .2);
  assert.equal(tracker.get(track.id).state, 'LOST');
  const result = tracker.update([observation('o2', 6100, 0.1)], 50, 6100, .2);
  assert.ok(['REACQUIRED', 'ACQUIRED'].includes(result.find(t => t.id === track.id).state));
});
await check('REACQUIRED survives all sensor observations for one tick and clears on the next tick', () => {
  const tracker = new TrackManager();
  const [track] = tracker.update([observation('o1', 50, 0)], 50, 50, .2);
  tracker.update([], 6000, 6050, .2);
  const onReacquire = tracker.update([
    observation('o2-radar', 6100, .2, 'RADAR_SYNTH'),
    observation('o2-visual', 6100, .25, 'VISUAL'),
    observation('o2-thermal', 6100, .23, 'THERMAL_SYNTH'),
  ], 50, 6100, .2);
  assert.equal(onReacquire.find(t => t.id === track.id).state, 'REACQUIRED');
  const nextTick = tracker.update([observation('o3', 6150, .3)], 50, 6150, .2);
  assert.equal(nextTick.find(t => t.id === track.id).state, 'TRACKING');
});

await check('resolved tracks keep moving and do not duplicate when observations continue', () => {
  const tracker = new TrackManager();
  const [track] = tracker.update([observation('o1', 50, 0)], 50, 50, .2);
  tracker.setTraineeClassification(track.id, 'BENIGN', .9);
  tracker.setDecision(track.id, 'MONITOR');
  const before = tracker.get(track.id).x;
  tracker.update([observation('o2', 100, 2)], 50, 100, .2);
  const updated = tracker.get(track.id);
  assert.equal(updated.state, 'RESOLVED');
  assert.ok(updated.x > before);
  assert.equal(tracker.getAll().length, 1);
});
await check('scoring rewards correct answers and does not mutate ground truth', () => {
  const entities = [entity('E1', 'BENIGN'), entity('E2', 'TRAINING_A')];
  const correct = [makeTrack('E1', 'BENIGN', expectedDecisionFor('BENIGN')), makeTrack('E2', 'TRAINING_A', expectedDecisionFor('TRAINING_A'))];
  const incorrect = [makeTrack('E1', 'TRAINING_A', 'ESCALATE'), makeTrack('E2', 'BENIGN', 'MONITOR')];
  const good = scoreSession(entities, correct, 5000), bad = scoreSession(entities, incorrect, 5000);
  assert.ok(good.classification > bad.classification && good.decision > bad.decision);
  assert.equal(entities[0].category, 'BENIGN');
  assert.equal(good.classification, 100);
  assert.equal(good.decision, 100);
});
await check('missing classifications remain in the denominator and ghost false positives are penalized', () => {
  const entities = [entity('E1', 'BENIGN'), entity('E2', 'UNKNOWN')];
  const partial = scoreSession(entities, [makeTrack('E1', 'BENIGN', 'MONITOR')], 5000);
  assert.equal(partial.classification, 50);
  const ghost = { ...makeTrack('GHOST', 'TRAINING_A', 'ESCALATE'), entityId: null };
  const full = scoreSession([entities[0]], [makeTrack('E1', 'BENIGN', 'MONITOR'), ghost], 5000);
  assert.ok(full.falsePositivePenalty > 0);
});
await check('adaptive difficulty rises/falls within defined bounds', () => {
  assert.ok(nextDifficulty([fakeSession(95), fakeSession(92)], .6) > .6);
  assert.ok(nextDifficulty([fakeSession(40), fakeSession(55)], .6) < .6);
  assert.ok(nextDifficulty([], 5) <= .95);
  assert.ok(nextDifficulty([], -3) >= .2);
});
await check('local synthetic classifier is deterministic and normalizes output probabilities', () => {
  const e = spawnEntities(generateScenario(192)).at(0);
  const a = predictSyntheticEntity(e), b = predictSyntheticEntity(e);
  assert.equal(a.provider, 'LOCAL-SYNTHETIC-LOGREG');
  assert.equal(a.label, b.label);
  assert.ok(a.confidence > 0);
  assert.ok(Math.abs(Object.values(a.distribution).reduce((x, y) => x + y, 0) - 1) < .01);
  assert.equal(localModelStatus().trained, true);
});
await check('track inference uses only observed state and gives valid confidence', () => {
  const result = predictSyntheticTrack({
    id: 'T-1', entityId: null, state: 'TRACKING', confidence: .62, x: 4, y: 20, z: 6,
    vx: 1.2, vy: 0, vz: .7, lastSeen: 500, ageMs: 0, sources: ['VISUAL'],
    history: [0,1,2].map(i => ({ t:i*100, x:i*.12, y:20, z:i*.07, confidence:.62 })),
  });
  assert.ok(result.label); assert.ok(result.confidence > 0 && result.confidence <= 1);
  assert.ok(result.latencyMs >= 0);
});

console.log(`V5 OFFLINE CORE VALIDATION: ${passed} tests passed.`);
fs.rmSync(temp, { recursive: true, force: true });
