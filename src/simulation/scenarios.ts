import type { EntityClass, Environment, ScenarioDNA, SensorHealth, TimeOfDay, Visibility } from '../types';
import { SeededRng } from './rng';

const environments: Environment[] = ['URBAN', 'RURAL', 'OPEN', 'INFRASTRUCTURE'];
const times: TimeOfDay[] = ['DAY', 'NIGHT'];
const visibilities: Visibility[] = ['CLEAR', 'HAZY', 'LOW'];
const sensors: SensorHealth[] = ['NOMINAL', 'DEGRADED', 'SEVERE'];
const mediaProfiles: ScenarioDNA['mediaProfile'][] = ['SENSOR_GRID', 'AERIAL_DAY', 'AERIAL_NIGHT', 'NONE'];
const titles = ['Urban Watch','Open Horizon','Degraded Picture','Night Transit','Signal Crossfade','Dense Background','Track Recovery','Synthetic Swarm','Evidence Assisted','Infrastructure Watch'];
const objectives = [
 'Maintain calibrated recognition under changing sensor quality.',
 'Separate benign background activity from training objects.',
 'Acquire and maintain track continuity when observations become incomplete.',
 'Balance response confidence with uncertain multi-sensor evidence.'
];

export function generateScenario(seed: number, overrides: Partial<ScenarioDNA> = {}): ScenarioDNA {
  const r = new SeededRng(seed);
  const difficulty = overrides.difficulty ?? Number(r.range(.28, .92).toFixed(2));
  const environment = overrides.environment ?? r.pick(environments);
  const timeOfDay = overrides.timeOfDay ?? r.pick(times);
  const visibility = overrides.visibility ?? (difficulty > .74 ? r.pick(['HAZY','LOW'] as Visibility[]) : r.pick(visibilities));
  const sensorHealth = overrides.sensorHealth ?? (difficulty > .8 ? 'SEVERE' : r.pick(sensors));
  const entityCount = overrides.entityCount ?? r.int(4, Math.min(14, 4 + Math.floor(difficulty * 11)));
  const ambiguity = overrides.ambiguity ?? Number(Math.min(.96, .2 + difficulty * .68 + r.range(-.06,.06)).toFixed(2));
  const backgroundActivity = overrides.backgroundActivity ?? Number(Math.min(.95, .18 + difficulty * .66 + r.range(-.06,.06)).toFixed(2));
  const trackingDifficulty = overrides.trackingDifficulty ?? Number(Math.min(.95, .18 + difficulty * .7 + r.range(-.08,.08)).toFixed(2));
  const mediaProfile = overrides.mediaProfile ?? (timeOfDay === 'NIGHT' ? 'AERIAL_NIGHT' : r.pick(mediaProfiles));
  return {
    id: overrides.id ?? `scn-${seed}`,
    version: 2,
    seed, environment, timeOfDay, visibility, sensorHealth, entityCount,
    ambiguity, backgroundActivity, difficulty,
    scenarioDuration: overrides.scenarioDuration ?? Math.round(45 + difficulty * 45),
    eventDensity: overrides.eventDensity ?? Number((.25 + difficulty * .65).toFixed(2)),
    mediaProfile, trackingDifficulty,
    sensorProfile: overrides.sensorProfile ?? (sensorHealth === 'SEVERE' ? 'SEVERE' : sensorHealth === 'DEGRADED' ? 'DEGRADED' : 'BASELINE'),
    title: overrides.title ?? `${r.pick(titles)} / ${environment} / ${timeOfDay}`,
    objective: overrides.objective ?? r.pick(objectives)
  };
}

export function spawnEntities(scenario: ScenarioDNA) {
  const r = new SeededRng(scenario.seed ^ 0x9e3779b9);
  const classes: EntityClass[] = ['BENIGN','UNKNOWN','TRAINING_A','TRAINING_B','TRAINING_C'];
  const profile: Record<EntityClass, { signature: [number, number]; speed: [number, number]; altitude: [number, number]; acceleration: [number, number] }> = {
    BENIGN: { signature: [.12, .42], speed: [.25, 1.35], altitude: [10, 25], acceleration: [.005, .045] },
    UNKNOWN: { signature: [.32, .68], speed: [.4, 2.5], altitude: [12, 36], acceleration: [.01, .07] },
    TRAINING_A: { signature: [.58, .96], speed: [1.65, 3.7], altitude: [14, 42], acceleration: [.02, .1] },
    TRAINING_B: { signature: [.36, .82], speed: [.7, 2.65], altitude: [23, 44], acceleration: [.01, .08] },
    TRAINING_C: { signature: [.16, .64], speed: [.2, 1.9], altitude: [29, 45], acceleration: [.005, .065] },
  };
  const categories = Array.from({ length: scenario.entityCount }, () =>
    r.next() < Math.max(.1, .46 - scenario.ambiguity * .18) ? 'BENIGN' as EntityClass : r.pick(classes.slice(1)));
  if (categories.length && categories.every(category => category === 'BENIGN')) categories[0] = 'TRAINING_A';

  return categories.map((category, index) => {
    const angle = r.range(0, Math.PI * 2), radius = r.range(22, 78);
    const feature = profile[category];
    const speed = r.range(feature.speed[0], feature.speed[1]);
    const heading = r.range(0, Math.PI * 2);
    const accelerationMagnitude = r.range(feature.acceleration[0], feature.acceleration[1]);
    const accelerationAngle = r.range(0, Math.PI * 2);
    return {
      id: `E-${String(index + 1).padStart(2, '0')}`,
      category,
      state: 'AIRBORNE' as const,
      x: Math.cos(angle) * radius,
      y: r.range(feature.altitude[0], feature.altitude[1]),
      z: Math.sin(angle) * radius,
      vx: Math.cos(heading) * speed,
      vy: r.range(-.12, .12),
      vz: Math.sin(heading) * speed,
      ax: Math.cos(accelerationAngle) * accelerationMagnitude,
      az: Math.sin(accelerationAngle) * accelerationMagnitude,
      signature: Number(r.range(feature.signature[0], feature.signature[1]).toFixed(3)),
      spawnT: r.range(0, scenario.difficulty * 8000),
    };
  });
}

const initialShowcaseScenarios = [
  generateScenario(182341,{ id:'showcase-urban-night', title:'Urban Watch / NIGHT', objective:'Separate synthetic tracks from dense background activity.', environment:'URBAN', timeOfDay:'NIGHT', visibility:'HAZY', sensorHealth:'DEGRADED', entityCount:7, difficulty:.68, mediaProfile:'AERIAL_NIGHT' }),
  generateScenario(927551,{ id:'showcase-open-day', title:'Open Horizon / DAY', objective:'Maintain fast, calibrated recognition under clear conditions.', environment:'OPEN', timeOfDay:'DAY', visibility:'CLEAR', sensorHealth:'NOMINAL', entityCount:5, difficulty:.38, mediaProfile:'AERIAL_DAY' }),
  generateScenario(448120,{ id:'showcase-degraded', title:'Degraded Picture / SEVERE', objective:'Preserve track continuity through severe synthetic sensor loss.', environment:'INFRASTRUCTURE', timeOfDay:'NIGHT', visibility:'LOW', sensorHealth:'SEVERE', entityCount:10, difficulty:.88, mediaProfile:'SENSOR_GRID' }),
  ...Array.from({length:17},(_,i)=>generateScenario(12000+i*7919))
];

const supplementaryShowcaseScenarios: ScenarioDNA[] = [
  generateScenario(21031, { title: 'Urban / False Returns', environment: 'URBAN', timeOfDay: 'DAY', visibility: 'HAZY', sensorHealth: 'NOMINAL', entityCount: 8, ambiguity: .58, backgroundActivity: .82, difficulty: .62, trackingDifficulty: .58, mediaProfile: 'SENSOR_GRID' }),
  generateScenario(21032, { title: 'Rural / Track Handover', environment: 'RURAL', timeOfDay: 'DAY', visibility: 'CLEAR', sensorHealth: 'DEGRADED', entityCount: 6, ambiguity: .42, backgroundActivity: .4, difficulty: .48, trackingDifficulty: .66, mediaProfile: 'AERIAL_DAY' }),
  generateScenario(21033, { title: 'Open / Sensor Dropout', environment: 'OPEN', timeOfDay: 'DAY', visibility: 'HAZY', sensorHealth: 'SEVERE', entityCount: 5, ambiguity: .66, backgroundActivity: .35, difficulty: .72, trackingDifficulty: .78, mediaProfile: 'SENSOR_GRID' }),
  generateScenario(21034, { title: 'Infrastructure / Multi-Contact', environment: 'INFRASTRUCTURE', timeOfDay: 'DAY', visibility: 'CLEAR', sensorHealth: 'NOMINAL', entityCount: 12, ambiguity: .35, backgroundActivity: .58, difficulty: .54, trackingDifficulty: .52, mediaProfile: 'AERIAL_DAY' }),
  generateScenario(21035, { title: 'Night / Confidence Calibration', environment: 'URBAN', timeOfDay: 'NIGHT', visibility: 'LOW', sensorHealth: 'DEGRADED', entityCount: 7, ambiguity: .8, backgroundActivity: .6, difficulty: .76, trackingDifficulty: .7, mediaProfile: 'AERIAL_NIGHT' }),
  generateScenario(21036, { title: 'High Clutter / Ambiguous Tracks', environment: 'INFRASTRUCTURE', timeOfDay: 'NIGHT', visibility: 'HAZY', sensorHealth: 'SEVERE', entityCount: 16, ambiguity: .88, backgroundActivity: .9, difficulty: .86, trackingDifficulty: .84, mediaProfile: 'SENSOR_GRID' }),
  generateScenario(21037, { title: 'Weather Veil / Low Visibility', environment: 'RURAL', timeOfDay: 'NIGHT', visibility: 'LOW', sensorHealth: 'DEGRADED', entityCount: 6, ambiguity: .72, backgroundActivity: .5, difficulty: .67, trackingDifficulty: .63, mediaProfile: 'AERIAL_NIGHT' }),
  generateScenario(21038, { title: 'Group Motion / Open Field', environment: 'OPEN', timeOfDay: 'DAY', visibility: 'CLEAR', sensorHealth: 'NOMINAL', entityCount: 14, ambiguity: .45, backgroundActivity: .34, difficulty: .58, trackingDifficulty: .47, mediaProfile: 'AERIAL_DAY' }),
  generateScenario(21039, { title: 'Evidence Assist / Signal Noise', environment: 'URBAN', timeOfDay: 'NIGHT', visibility: 'HAZY', sensorHealth: 'SEVERE', entityCount: 9, ambiguity: .85, backgroundActivity: .74, difficulty: .82, trackingDifficulty: .76, mediaProfile: 'SENSOR_GRID' }),
  generateScenario(21040, { title: 'Long Run / Track Continuity', environment: 'RURAL', timeOfDay: 'DAY', visibility: 'CLEAR', sensorHealth: 'NOMINAL', entityCount: 10, ambiguity: .3, backgroundActivity: .22, difficulty: .42, trackingDifficulty: .55, scenarioDuration: 120, mediaProfile: 'AERIAL_DAY' }),
];

export const showcaseScenarios: ScenarioDNA[] = [...initialShowcaseScenarios, ...supplementaryShowcaseScenarios];
