import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.AID_C2S_PORT || 4177);
const dataFile = process.env.AID_C2S_DATA_FILE || path.join(here, 'data', 'aid-c2s-state.json');
const MAX_BODY = 32 * 1024 * 1024;
const allowedOrigins = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const defaults = () => ({ version: 5, sessions: [], scenarios: [], profiles: [], settings: [{ id: 'global', quality: 'HIGH', simulationSpeed: 1, reducedMotion: false }] });

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}
function string(value, label, max = 180) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label} must be a non-empty string up to ${max} characters.`);
  return value.trim();
}
function finite(value, label, min = -Infinity, max = Infinity) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be a finite number from ${min} to ${max}.`);
  return value;
}
function validateScenario(raw) {
  const s = object(raw, 'Scenario');
  string(s.id, 'Scenario ID', 120);
  if (!Number.isFinite(s.seed) || !Number.isInteger(s.seed) || s.seed < 0 || s.seed > 0xffffffff) throw new Error('Scenario seed must be a uint32 integer.');
  if (!['URBAN', 'RURAL', 'OPEN', 'INFRASTRUCTURE'].includes(s.environment)) throw new Error('Scenario environment is unsupported.');
  if (!['DAY', 'NIGHT'].includes(s.timeOfDay)) throw new Error('Scenario timeOfDay is unsupported.');
  if (!['CLEAR', 'HAZY', 'LOW'].includes(s.visibility)) throw new Error('Scenario visibility is unsupported.');
  if (!['NOMINAL', 'DEGRADED', 'SEVERE'].includes(s.sensorHealth)) throw new Error('Scenario sensorHealth is unsupported.');
  if (!['SENSOR_GRID', 'AERIAL_DAY', 'AERIAL_NIGHT', 'NONE'].includes(s.mediaProfile)) throw new Error('Scenario mediaProfile is unsupported.');
  for (const key of ['difficulty', 'ambiguity', 'backgroundActivity', 'trackingDifficulty', 'eventDensity']) finite(s[key], `Scenario ${key}`, 0, 1);
  finite(s.entityCount, 'Scenario entityCount', 1, 40);
  if (!Number.isInteger(s.entityCount)) throw new Error('Scenario entityCount must be an integer.');
  finite(s.scenarioDuration, 'Scenario scenarioDuration', 10, 300);
  if (!Number.isInteger(s.scenarioDuration)) throw new Error('Scenario scenarioDuration must be an integer.');
  string(s.title, 'Scenario title', 120);
  string(s.objective, 'Scenario objective', 600);
  return { ...s, version: 2 };
}
function validateProfile(raw) {
  const p = object(raw, 'Profile');
  return { id: string(p.id, 'Profile ID', 120), name: string(p.name, 'Profile name', 80), role: string(p.role, 'Profile role', 80), createdAt: finite(p.createdAt, 'Profile createdAt', 0), ...(p.archived === true ? { archived: true } : {}) };
}
function validateSettings(raw) {
  const s = object(raw, 'Settings');
  if (!['HIGH', 'BALANCED', 'LOW'].includes(s.quality)) throw new Error('Settings quality is invalid.');
  finite(s.simulationSpeed, 'Settings simulationSpeed', 0.25, 4);
  if (typeof s.reducedMotion !== 'boolean') throw new Error('Settings reducedMotion must be boolean.');
  return { id: string(s.id || 'global', 'Settings ID', 60), quality: s.quality, simulationSpeed: s.simulationSpeed, reducedMotion: s.reducedMotion };
}
function validateSession(raw) {
  const s = object(raw, 'Session');
  const scenario = validateScenario(s.scenario);
  string(s.id, 'Session ID', 140);
  string(s.profileId, 'Session profileId', 120);
  finite(s.startedAt, 'Session startedAt', 0);
  finite(s.endedAt, 'Session endedAt', 0);
  finite(s.durationMs, 'Session durationMs', 0, 86_400_000);
  finite(s.trackCount, 'Session trackCount', 0, 1000);
  if (!Array.isArray(s.events) || s.events.length > 50000) throw new Error('Session events must be an array with at most 50000 records.');
  const allowedEventTypes = new Set(['SESSION_STARTED', 'ENTITY_SPAWNED', 'OBSERVATION_CREATED', 'TRACK_CREATED', 'TRACK_ACQUIRED', 'TRACK_LOST', 'TRACK_REACQUIRED', 'ENTITY_DETECTED', 'CLASSIFICATION_SUBMITTED', 'DECISION_SUBMITTED', 'SENSOR_CHANGED', 'MEDIA_CHANGED', 'SCENARIO_COMPLETED', 'PAUSED', 'RESUMED', 'REPLAY_KEYFRAME', 'SENSOR_KEYFRAME']);
  for (const [i, event] of s.events.entries()) {
    object(event, `Event ${i + 1}`);
    string(event.id, `Event ${i + 1} ID`, 140);
    const eventType = string(event.type, `Event ${i + 1} type`, 80);
    if (!allowedEventTypes.has(eventType)) throw new Error(`Event ${i + 1} uses an unsupported event type.`);
    finite(event.t, `Event ${i + 1} time`, 0, 86_400_000);
    object(event.payload, `Event ${i + 1} payload`);
  }
  const score = object(s.score, 'Session score');
  for (const key of ['total', 'detection', 'classification', 'decision', 'confidenceCalibration', 'trackContinuity', 'completion', 'falsePositivePenalty']) finite(score[key], `Score ${key}`, 0, 100);
  if (s.endedAt < s.startedAt) throw new Error('Session end time must be at or after session start.');
  if (!Array.isArray(s.mistakes) || !s.mistakes.every(item => typeof item === 'string')) throw new Error('Session mistakes must be a string array.');
  if (!Array.isArray(s.strengths) || !s.strengths.every(item => typeof item === 'string')) throw new Error('Session strengths must be a string array.');
  return { ...s, scenario, mediaProfile: scenario.mediaProfile };
}
function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const s = object(raw, 'Stored state');
    return {
      version: 5,
      sessions: Array.isArray(s.sessions) ? s.sessions.map(validateSession) : [],
      scenarios: Array.isArray(s.scenarios) ? s.scenarios.map(validateScenario) : [],
      profiles: Array.isArray(s.profiles) ? s.profiles.map(validateProfile) : [],
      settings: Array.isArray(s.settings) ? s.settings.map(validateSettings) : defaults().settings,
    };
  } catch {
    return defaults();
  }
}
function save(state) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const temp = `${dataFile}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(state, null, 2), 'utf8');
  // Retain a last-known-good backup before atomically replacing persisted state.
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, `${dataFile}.bak`);
  fs.renameSync(temp, dataFile);
}
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
async function body(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) throw Object.assign(new Error('Request body exceeds 32 MB.'), { statusCode: 413 });
    chunks.push(chunk);
  }
  if (!total) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 }); }
}
function mergeById(existing, incoming) {
  const map = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}
function notFound(res) { return json(res, 404, { ok: false, error: 'not_found' }); }

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.test(origin)) return json(res, 403, { ok: false, error: 'origin_not_allowed' });
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const route = url.pathname;
  try {
    if (req.method === 'GET' && route === '/api/health') return json(res, 200, { ok: true, service: 'aid-c2s-local-api', version: 5, storage: 'atomic-json-local' });
    const state = load();
    if (req.method === 'GET' && (route === '/api/state' || route === '/api/export')) {
      return json(res, 200, { ...state, format: 'AID-C2S-BACKUP-V5', exportedAt: new Date().toISOString() });
    }
    if (req.method === 'POST' && route === '/api/import') {
      const payload = object(await body(req), 'Import');
      for (const key of ['sessions', 'scenarios', 'profiles', 'settings']) {
        if (payload[key] !== undefined && !Array.isArray(payload[key])) throw new Error(`Import ${key} must be an array.`);
      }
      const imported = {
        sessions: (payload.sessions || []).map(validateSession),
        scenarios: (payload.scenarios || []).map(validateScenario),
        profiles: (payload.profiles || []).map(validateProfile),
        settings: (payload.settings || []).map(validateSettings),
      };
      const next = payload.merge === false ? defaults() : state;
      next.sessions = mergeById(next.sessions, imported.sessions).sort((a, b) => b.endedAt - a.endedAt).slice(0, 5000);
      next.scenarios = mergeById(next.scenarios, imported.scenarios).slice(0, 1000);
      next.profiles = mergeById(next.profiles, imported.profiles).slice(0, 1000);
      next.settings = mergeById(next.settings, imported.settings);
      next.version = 5;
      save(next);
      return json(res, 200, { ok: true, counts: { sessions: next.sessions.length, scenarios: next.scenarios.length, profiles: next.profiles.length, settings: next.settings.length } });
    }

    const collections = [
      { name: 'sessions', validate: validateSession, id: s => s.id },
      { name: 'scenarios', validate: validateScenario, id: s => s.id },
      { name: 'profiles', validate: validateProfile, id: s => s.id },
    ];
    for (const collection of collections) {
      const base = `/api/${collection.name}`;
      if (req.method === 'GET' && route === base) return json(res, 200, state[collection.name]);
      if (req.method === 'POST' && route === base) {
        const item = collection.validate(await body(req));
        state[collection.name] = mergeById(state[collection.name], [item]);
        if (collection.name === 'sessions') state.sessions.sort((a, b) => b.endedAt - a.endedAt).splice(5000);
        save(state);
        return json(res, 201, { ok: true, id: collection.id(item) });
      }
      const match = route.match(new RegExp(`^${base}/([^/]+)$`));
      if (match && req.method === 'DELETE') {
        const id = decodeURIComponent(match[1]);
        const before = state[collection.name].length;
        state[collection.name] = state[collection.name].filter(item => collection.id(item) !== id);
        if (before === state[collection.name].length) return notFound(res);
        save(state);
        return json(res, 200, { ok: true, deleted: id });
      }
    }
    if (route === '/api/settings' && req.method === 'GET') return json(res, 200, state.settings[0] ?? defaults().settings[0]);
    if (route === '/api/settings' && req.method === 'PUT') {
      const payload = await body(req);
      const settings = validateSettings({ id: 'global', ...object(payload.settings ?? payload, 'Settings') });
      state.settings = [settings]; save(state); return json(res, 200, { ok: true, settings });
    }
    return notFound(res);
  } catch (error) {
    const status = Number(error?.statusCode) || 400;
    return json(res, status, { ok: false, error: error instanceof Error ? error.message : 'request_failed' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`AID-C2S V5 local API listening at http://127.0.0.1:${PORT}`);
  console.log(`Data file: ${dataFile}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
