import Dexie, { type Table } from 'dexie';
import type { AppSettings, Profile, ScenarioDNA, SessionRecord } from '../types';

export class AIDDatabase extends Dexie {
  scenarios!: Table<ScenarioDNA, string>;
  sessions!: Table<SessionRecord, string>;
  profiles!: Table<Profile, string>;
  settings!: Table<AppSettings & { id: string }, string>;
  constructor() {
    super('aid-c2s-v2');
    this.version(1).stores({
      scenarios: 'id, seed, difficulty, environment, title',
      sessions: 'id, profileId, startedAt, score.total, scenario.id',
      profiles: 'id, createdAt, archived',
      settings: 'id'
    });
  }
}
export const db = new AIDDatabase();
export const defaultSettings: AppSettings = { quality: 'HIGH', simulationSpeed: 1, reducedMotion: false };
export async function ensureSeeded(scenarios: ScenarioDNA[]) {
  // One read/write transaction makes startup idempotent under React StrictMode and
  // concurrent app windows, preventing duplicate profile/settings inserts.
  await db.transaction('rw', db.profiles, db.settings, db.scenarios, async () => {
    if ((await db.profiles.count()) === 0) {
      await db.profiles.add({ id: 'profile-default', name: 'Operator 01', role: 'Trainee', createdAt: Date.now() });
    }
    if ((await db.settings.get('global')) === undefined) {
      await db.settings.put({ ...defaultSettings, id: 'global' });
    }
    const existing = new Set((await db.scenarios.toArray()).map(s => s.id));
    const missing = scenarios.filter(s => !existing.has(s.id));
    if (missing.length) await db.scenarios.bulkPut(missing);
  });
}
