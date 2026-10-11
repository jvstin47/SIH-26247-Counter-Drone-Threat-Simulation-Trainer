import { create } from 'zustand';
import type { AppSettings, Profile, ScenarioDNA, ScoreBreakdown, SessionRecord, SystemCapabilities, TrainingEvent, ViewId } from '../types';
import { validateScenario } from '../simulation/validation';
import { repository } from '../services/repository';

interface SimState {
  activeView: ViewId;
  scenario: ScenarioDNA | null;
  selectedTrackId: string | null;
  events: TrainingEvent[];
  score: ScoreBreakdown | null;
  sessions: SessionRecord[];
  profiles: Profile[];
  activeProfile: Profile | null;
  scenarios: ScenarioDNA[];
  capabilities: SystemCapabilities;
  settings: AppSettings;
  lastSession: SessionRecord | null;
  setView: (view: ViewId) => void;
  setScenario: (scenario: ScenarioDNA) => void;
  setSelectedTrack: (id: string | null) => void;
  appendEvent: (event: TrainingEvent) => void;
  setScore: (score: ScoreBreakdown | null) => void;
  setCapabilities: (capabilities: SystemCapabilities) => void;
  loadAll: () => Promise<void>;
  finalizeSession: (session: SessionRecord) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveScenario: (scenario: ScenarioDNA) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  setActiveProfile: (profile: Profile) => void;
  createProfile: (name: string, role: string) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  archiveProfile: (id: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  importAll: (payload: unknown) => Promise<void>;
}

const selectedProfileKey = 'aid-c2s-active-profile';
function readSavedProfileId() { try { return typeof window !== 'undefined' ? window.localStorage.getItem(selectedProfileKey) : null; } catch { return null; } }
function writeSavedProfileId(id: string) { try { if (typeof window !== 'undefined') window.localStorage.setItem(selectedProfileKey, id); } catch { /* IndexedDB remains authoritative if localStorage is blocked. */ } }
const initialCapabilities: SystemCapabilities = {
  webgpu: false,
  webxr: false,
  storage: true,
  online: typeof navigator === 'undefined' ? false : navigator.onLine,
  serviceWorker: false,
};

export const useSimStore = create<SimState>((set, get) => ({
  activeView: 'command', scenario: null, selectedTrackId: null, events: [], score: null,
  sessions: [], profiles: [], activeProfile: null, scenarios: [], capabilities: initialCapabilities,
  settings: { quality: 'HIGH', simulationSpeed: 1, reducedMotion: false }, lastSession: null,
  setView: view => {
    set({ activeView: view });
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#/${view}`);
  },
  setScenario: scenario => set({ scenario, events: [], score: null, selectedTrackId: null }),
  setSelectedTrack: selectedTrackId => set({ selectedTrackId }),
  appendEvent: event => set(state => ({ events: [...state.events, event].slice(-12000) })),
  setScore: score => set({ score }),
  setCapabilities: capabilities => set({ capabilities }),
  loadAll: async () => {
    const [sessions, profiles, scenarios, settings] = await Promise.all([
      repository.listSessions(), repository.listProfiles(), repository.listScenarios(), repository.getSettings(),
    ]);
    const savedId = readSavedProfileId();
    const activeProfile = profiles.find(profile => profile.id === savedId) ?? profiles[0] ?? null;
    if (activeProfile) writeSavedProfileId(activeProfile.id);
    const profileSessions = activeProfile ? sessions.filter(session => session.profileId === activeProfile.id) : [];
    set({ sessions, profiles, activeProfile, scenarios, settings: settings ?? get().settings, lastSession: profileSessions[0] ?? null });
  },
  finalizeSession: async session => {
    await repository.saveSession(session);
    const sessions = [session, ...get().sessions.filter(item => item.id !== session.id)].sort((a, b) => b.endedAt - a.endedAt);
    set({ lastSession: session, sessions });
  },
  deleteSession: async id => {
    await repository.deleteSession(id);
    const sessions = get().sessions.filter(session => session.id !== id);
    let lastSession = get().lastSession;
    if (lastSession?.id === id) {
      const activeProfileId = get().activeProfile?.id;
      lastSession = (activeProfileId ? sessions.filter(session => session.profileId === activeProfileId) : sessions)
        .sort((a, b) => b.endedAt - a.endedAt)[0] ?? null;
    }
    set({ sessions, lastSession });
  },
  saveScenario: async scenario => {
    await repository.saveScenario(scenario);
    set({ scenarios: await repository.listScenarios() });
  },
  deleteScenario: async id => {
    await repository.deleteScenario(id);
    set({ scenarios: await repository.listScenarios() });
  },
  setActiveProfile: profile => {
    writeSavedProfileId(profile.id);
    const lastSession = get().sessions
      .filter(session => session.profileId === profile.id)
      .sort((a, b) => b.endedAt - a.endedAt)[0] ?? null;
    set({ activeProfile: profile, lastSession });
  },
  createProfile: async (name, role) => {
    const clean = name.trim();
    if (!clean) throw new Error('Profile name cannot be empty.');
    const profile: Profile = { id: `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: clean, role, createdAt: Date.now() };
    await repository.saveProfile(profile);
    writeSavedProfileId(profile.id);
    set({ profiles: await repository.listProfiles(), activeProfile: profile, lastSession: null });
  },
  renameProfile: async (id, name) => {
    const current = get().profiles.find(profile => profile.id === id);
    const clean = name.trim();
    if (!current) throw new Error('Profile was not found.');
    if (!clean) throw new Error('Profile name cannot be empty.');
    const profile = { ...current, name: clean };
    await repository.saveProfile(profile);
    set({ profiles: await repository.listProfiles(), activeProfile: get().activeProfile?.id === id ? profile : get().activeProfile });
  },
  archiveProfile: async id => {
    if (get().profiles.length <= 1) throw new Error('At least one active profile must remain.');
    await repository.archiveProfile(id);
    const profiles = await repository.listProfiles();
    const activeProfile = get().activeProfile?.id === id ? profiles[0] ?? null : get().activeProfile;
    if (activeProfile) writeSavedProfileId(activeProfile.id);
    const profileSession = activeProfile ? get().sessions.filter(session => session.profileId === activeProfile.id).sort((a, b) => b.endedAt - a.endedAt)[0] ?? null : null;
    set({ profiles, activeProfile, lastSession: profileSession });
  },
  saveSettings: async settings => {
    await repository.saveSettings(settings);
    set({ settings });
  },
  importAll: async payload => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Backup must be a JSON object.');
    const data = payload as Record<string, unknown>;
    for (const key of ['scenarios', 'sessions', 'profiles', 'settings']) {
      if (data[key] !== undefined && !Array.isArray(data[key])) throw new Error(`Invalid backup section: ${key}.`);
    }
    const scenarios = Array.isArray(data.scenarios) ? data.scenarios.map(validateScenario) : undefined;
    const sessions = Array.isArray(data.sessions) ? data.sessions.map(validateSessionRecord) : undefined;
    const profiles = Array.isArray(data.profiles) ? data.profiles.map(validateProfile) : undefined;
    const settings = Array.isArray(data.settings) ? data.settings.map(validateSettings) : undefined;
    await repository.importAll({ scenarios, sessions, profiles, settings });
    await get().loadAll();
  },
}));



function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function stringField(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function numberField(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
}
function validateProfile(value: unknown): Profile {
  const row = objectRecord(value, 'Profile');
  return { id: stringField(row.id, 'Profile ID'), name: stringField(row.name, 'Profile name'), role: stringField(row.role, 'Profile role'), createdAt: numberField(row.createdAt, 'Profile createdAt'), ...(row.archived === true ? { archived: true } : {}) };
}
function validateSettings(value: unknown): AppSettings & { id: string } {
  const row = objectRecord(value, 'Settings');
  if (!['HIGH', 'BALANCED', 'LOW'].includes(String(row.quality))) throw new Error('Invalid graphics quality in backup.');
  const speed = numberField(row.simulationSpeed, 'Simulation speed');
  if (speed < .25 || speed > 4) throw new Error('Simulation speed must be from 0.25× to 4×.');
  if (typeof row.reducedMotion !== 'boolean') throw new Error('Reduced motion must be boolean.');
  return { id: stringField(row.id, 'Settings ID'), quality: row.quality as AppSettings['quality'], simulationSpeed: speed, reducedMotion: row.reducedMotion };
}
function validateSessionRecord(value: unknown): SessionRecord {
  const row = objectRecord(value, 'Session');
  const scenario = validateScenario(row.scenario);
  if (!Array.isArray(row.events)) throw new Error('Session event stream must be an array.');
  const allowedEventTypes = new Set<TrainingEvent['type']>([
    'SESSION_STARTED', 'ENTITY_SPAWNED', 'OBSERVATION_CREATED', 'TRACK_CREATED', 'TRACK_ACQUIRED',
    'TRACK_LOST', 'TRACK_REACQUIRED', 'ENTITY_DETECTED', 'CLASSIFICATION_SUBMITTED', 'DECISION_SUBMITTED',
    'SENSOR_CHANGED', 'MEDIA_CHANGED', 'SCENARIO_COMPLETED', 'PAUSED', 'RESUMED', 'REPLAY_KEYFRAME', 'SENSOR_KEYFRAME',
  ]);
  const events = row.events.map((entry, index) => {
    const event = objectRecord(entry, `Event ${index + 1}`);
    if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) throw new Error(`Event ${index + 1} payload must be an object.`);
    const type = stringField(event.type, `Event ${index + 1} type`) as TrainingEvent['type'];
    if (!allowedEventTypes.has(type)) throw new Error(`Event ${index + 1} uses an unsupported event type.`);
    const t = numberField(event.t, `Event ${index + 1} timestamp`);
    if (t < 0 || t > 86_400_000) throw new Error(`Event ${index + 1} timestamp is outside the supported session duration.`);
    return { id: stringField(event.id, `Event ${index + 1} ID`), type, t, payload: event.payload as Record<string, unknown> };
  });
  const rawScore = objectRecord(row.score, 'Session score');
  const scoreValue = (key: keyof ScoreBreakdown, label: string) => {
    const value = numberField(rawScore[key], label);
    if (value < 0 || value > 100) throw new Error(`${label} must be from 0 to 100.`);
    return value;
  };
  const score: ScoreBreakdown = {
    total: scoreValue('total', 'Total score'),
    detection: scoreValue('detection', 'Detection score'),
    classification: scoreValue('classification', 'Classification score'),
    decision: scoreValue('decision', 'Decision score'),
    confidenceCalibration: scoreValue('confidenceCalibration', 'Confidence calibration'),
    trackContinuity: scoreValue('trackContinuity', 'Track continuity'),
    completion: scoreValue('completion', 'Completion score'),
    falsePositivePenalty: scoreValue('falsePositivePenalty', 'False-positive penalty'),
  };
  if (!Array.isArray(row.mistakes) || !row.mistakes.every(note => typeof note === 'string')) throw new Error('Session mistakes must be a string array.');
  if (!Array.isArray(row.strengths) || !row.strengths.every(note => typeof note === 'string')) throw new Error('Session strengths must be a string array.');
  const startedAt = numberField(row.startedAt, 'Session start');
  const endedAt = numberField(row.endedAt, 'Session end');
  const trackCount = numberField(row.trackCount, 'Track count');
  const durationMs = numberField(row.durationMs, 'Session duration');
  if (startedAt < 0 || endedAt < startedAt) throw new Error('Session end time must be at or after session start.');
  if (trackCount < 0 || trackCount > 1000) throw new Error('Track count must be from 0 to 1000.');
  if (durationMs < 0 || durationMs > 86_400_000) throw new Error('Session duration is outside the supported bound.');
  return {
    id: stringField(row.id, 'Session ID'), profileId: stringField(row.profileId, 'Session profile ID'),
    startedAt, endedAt, scenario, events, score, mistakes: row.mistakes as string[], strengths: row.strengths as string[],
    trackCount, mediaProfile: scenario.mediaProfile, durationMs,
  };
}
