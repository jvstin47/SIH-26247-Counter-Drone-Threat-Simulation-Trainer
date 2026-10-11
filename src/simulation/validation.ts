import type { Environment, ScenarioDNA, SensorHealth, TimeOfDay, Visibility } from '../types';

const environments: Environment[] = ['URBAN', 'RURAL', 'OPEN', 'INFRASTRUCTURE'];
const timeOfDays: TimeOfDay[] = ['DAY', 'NIGHT'];
const visibilities: Visibility[] = ['CLEAR', 'HAZY', 'LOW'];
const sensorHealth: SensorHealth[] = ['NOMINAL', 'DEGRADED', 'SEVERE'];
const mediaProfiles: ScenarioDNA['mediaProfile'][] = ['SENSOR_GRID', 'AERIAL_DAY', 'AERIAL_NIGHT', 'NONE'];
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function validateScenario(value: unknown): ScenarioDNA {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Scenario must be a JSON object.');
  const scenario = value as Record<string, unknown>;
  if (!finite(scenario.seed)) throw new Error('Scenario seed must be a finite number.');
  if (typeof scenario.environment !== 'string' || !environments.includes(scenario.environment as Environment)) throw new Error('Unsupported scenario environment.');
  if (typeof scenario.timeOfDay !== 'string' || !timeOfDays.includes(scenario.timeOfDay as TimeOfDay)) throw new Error('Unsupported time of day.');
  if (typeof scenario.visibility !== 'string' || !visibilities.includes(scenario.visibility as Visibility)) throw new Error('Unsupported visibility.');
  if (typeof scenario.sensorHealth !== 'string' || !sensorHealth.includes(scenario.sensorHealth as SensorHealth)) throw new Error('Unsupported sensor health.');
  if (typeof scenario.mediaProfile !== 'string' || !mediaProfiles.includes(scenario.mediaProfile as ScenarioDNA['mediaProfile'])) throw new Error('Unsupported media profile.');
  for (const key of ['difficulty', 'ambiguity', 'backgroundActivity', 'trackingDifficulty', 'eventDensity']) {
    if (!finite(scenario[key]) || Number(scenario[key]) < 0 || Number(scenario[key]) > 1) throw new Error(`${key} must be between 0 and 1.`);
  }
  if (!finite(scenario.entityCount) || !Number.isInteger(scenario.entityCount) || scenario.entityCount < 1 || scenario.entityCount > 40) throw new Error('Entity count must be an integer from 1 to 40.');
  if (!finite(scenario.scenarioDuration) || scenario.scenarioDuration < 10 || scenario.scenarioDuration > 300) throw new Error('Scenario duration must be 10–300 seconds.');
  if (typeof scenario.id !== 'string' || !scenario.id.trim()) throw new Error('Scenario ID is required.');
  if (typeof scenario.title !== 'string' || !scenario.title.trim()) throw new Error('Scenario title is required.');
  if (typeof scenario.objective !== 'string') throw new Error('Scenario objective is required.');
  const sensorProfile = ['BASELINE', 'DEGRADED', 'SEVERE'].includes(String(scenario.sensorProfile)) ? scenario.sensorProfile : 'BASELINE';
  return {
    ...scenario,
    id: scenario.id.trim(),
    version: 2,
    seed: Math.trunc(Number(scenario.seed)) >>> 0,
    environment: scenario.environment as Environment,
    timeOfDay: scenario.timeOfDay as TimeOfDay,
    visibility: scenario.visibility as Visibility,
    sensorHealth: scenario.sensorHealth as SensorHealth,
    entityCount: Math.trunc(Number(scenario.entityCount)),
    difficulty: Number(scenario.difficulty),
    ambiguity: Number(scenario.ambiguity),
    backgroundActivity: Number(scenario.backgroundActivity),
    trackingDifficulty: Number(scenario.trackingDifficulty),
    eventDensity: Number(scenario.eventDensity),
    scenarioDuration: Math.trunc(Number(scenario.scenarioDuration)),
    mediaProfile: scenario.mediaProfile as ScenarioDNA['mediaProfile'],
    sensorProfile: sensorProfile as ScenarioDNA['sensorProfile'],
    title: scenario.title.trim(),
    objective: String(scenario.objective).trim(),
  } as ScenarioDNA;
}
