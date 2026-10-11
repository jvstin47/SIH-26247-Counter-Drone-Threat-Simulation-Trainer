import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aid-c2s-api-v5-'));
const port = 43871 + Math.floor(Math.random() * 500);
const dataFile = path.join(temp, 'state.json');
const child = spawn(process.execPath, [path.join(root, 'server', 'index.mjs')], {
  cwd: root,
  env: { ...process.env, AID_C2S_PORT: String(port), AID_C2S_DATA_FILE: dataFile },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', chunk => logs += chunk.toString());
child.stderr.on('data', chunk => logs += chunk.toString());
const base = `http://127.0.0.1:${port}`;
async function request(route, options) {
  return fetch(`${base}${route}`, options);
}
async function waitReady() {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error(`API process exited early: ${logs}`);
    try { const res = await request('/api/health'); if (res.ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`API did not start: ${logs}`);
}
const scenario = {
  id: 'api-test-scenario', version: 2, seed: 42, environment: 'URBAN', timeOfDay: 'DAY',
  visibility: 'CLEAR', sensorHealth: 'NOMINAL', entityCount: 2, ambiguity: .3,
  backgroundActivity: .25, difficulty: .4, scenarioDuration: 60, eventDensity: .5,
  mediaProfile: 'AERIAL_DAY', trackingDifficulty: .4, sensorProfile: 'BASELINE',
  title: 'API Test Scenario', objective: 'Test local API data persistence.',
};
const session = {
  id: 'api-test-session', profileId: 'api-profile', startedAt: 100, endedAt: 200,
  scenario, events: [{ id: 'evt-1', type: 'SESSION_STARTED', t: 0, payload: { seed: 42 } }],
  score: { total: 80, detection: 90, classification: 80, decision: 70, confidenceCalibration: 75, trackContinuity: 80, completion: 100, falsePositivePenalty: 0 },
  mistakes: [], strengths: ['Good test coverage'], trackCount: 2, mediaProfile: 'AERIAL_DAY', durationMs: 100,
};
const profile = { id: 'api-profile', name: 'Local Test Operator', role: 'Trainee', createdAt: 1 };
let failures = 0, passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`); }
}
try {
  await waitReady();
  await check('health endpoint reports V5 service', async () => {
    const r = await request('/api/health'); const j = await r.json();
    assert.equal(r.status, 200); assert.equal(j.ok, true); assert.equal(j.version, 5);
  });
  await check('scenario CRUD persists validated scenario', async () => {
    const post = await request('/api/scenarios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(scenario) });
    assert.equal(post.status, 201);
    const list = await (await request('/api/scenarios')).json(); assert.equal(list[0].id, scenario.id);
    const del = await request(`/api/scenarios/${scenario.id}`, { method: 'DELETE' }); assert.equal(del.status, 200);
  });
  await check('sessions and profiles persist in local API', async () => {
    const rp = await request('/api/profiles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) }); assert.equal(rp.status, 201);
    const rs = await request('/api/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(session) }); assert.equal(rs.status, 201);
    const sessions = await (await request('/api/sessions')).json(); assert.equal(sessions[0].id, session.id);
    const profiles = await (await request('/api/profiles')).json(); assert.equal(profiles[0].id, profile.id);
  });
  await check('backup import merges by ID without duplicate records', async () => {
    const response = await request('/api/import', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ format: 'AID-C2S-BACKUP-V5', merge: true, scenarios: [scenario], sessions: [session], profiles: [profile], settings: [{ id: 'global', quality: 'HIGH', simulationSpeed: 1, reducedMotion: false }] }) });
    assert.equal(response.status, 200);
    const state = await (await request('/api/state')).json();
    assert.equal(state.sessions.filter(x => x.id === session.id).length, 1);
    assert.equal(state.scenarios.filter(x => x.id === scenario.id).length, 1);
    assert.equal(state.format, 'AID-C2S-BACKUP-V5');
  });
  await check('malformed scenarios are rejected with a useful 400', async () => {
    const response = await request('/api/scenarios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...scenario, entityCount: 900 }) });
    assert.equal(response.status, 400); const body = await response.json(); assert.match(body.error, /entityCount/);
  });
  await check('unknown routes and disallowed origins are rejected', async () => {
    assert.equal((await request('/not-a-route')).status, 404);
    const r = await request('/api/health', { headers: { origin: 'https://evil.example' } }); assert.equal(r.status, 403);
  });
  await check('settings are validated and saved', async () => {
    const r = await request('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quality: 'BALANCED', simulationSpeed: 2, reducedMotion: true }) });
    assert.equal(r.status, 200); const s = await (await request('/api/settings')).json(); assert.equal(s.simulationSpeed, 2); assert.equal(s.reducedMotion, true);
    const bad = await request('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quality: 'BAD', simulationSpeed: 20, reducedMotion: true }) }); assert.equal(bad.status, 400);
  });
  await check('writes are persisted and last-known-good backup is retained', async () => {
    assert.ok(fs.existsSync(dataFile));
    const response = await request('/api/sessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...session, id: 'api-test-session-2' }) }); assert.equal(response.status, 201);
    assert.ok(fs.existsSync(`${dataFile}.bak`));
  });
  console.log(`\nV5 BACKEND API: ${passed} passed, ${failures} failed.`);
  if (failures) process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(1000)]);
  fs.rmSync(temp, { recursive: true, force: true });
}
