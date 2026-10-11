import { db } from '../db/db';
import type { AppSettings, Profile, ScenarioDNA, SessionRecord } from '../types';

export const repository = {
  listSessions: () => db.sessions.orderBy('startedAt').reverse().toArray(),
  listScenarios: () => db.scenarios.orderBy('difficulty').toArray(),
  listProfiles: () => db.profiles.filter(p => !p.archived).sortBy('createdAt'),
  saveSession: (session: SessionRecord) => db.sessions.put(session),
  deleteSession: (id: string) => db.sessions.delete(id),
  saveScenario: (scenario: ScenarioDNA) => db.scenarios.put(scenario),
  deleteScenario: (id: string) => db.scenarios.delete(id),
  saveProfile: (profile: Profile) => db.profiles.put(profile),
  archiveProfile: (id: string) => db.profiles.update(id, { archived: true }),
  getSettings: async () => (await db.settings.get('global')) ?? null,
  saveSettings: (settings: AppSettings) => db.settings.put({ ...settings, id: 'global' }),
  exportAll: async () => ({
    version: 5,
    exportedAt: new Date().toISOString(),
    scenarios: await db.scenarios.toArray(),
    sessions: await db.sessions.toArray(),
    profiles: await db.profiles.toArray(),
    settings: await db.settings.toArray()
  }),
  importAll: async (payload: { scenarios?: ScenarioDNA[]; sessions?: SessionRecord[]; profiles?: Profile[]; settings?: Array<AppSettings & { id: string }> }) => {
    await db.transaction('rw', db.scenarios, db.sessions, db.profiles, db.settings, async () => {
      if (payload.scenarios?.length) await db.scenarios.bulkPut(payload.scenarios);
      if (payload.sessions?.length) await db.sessions.bulkPut(payload.sessions);
      if (payload.profiles?.length) await db.profiles.bulkPut(payload.profiles);
      if (payload.settings?.length) await db.settings.bulkPut(payload.settings);
    });
  },
  clearTrainingData: async () => db.sessions.clear()
};
