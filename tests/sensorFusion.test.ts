import { describe, expect, it } from 'vitest';
import { SensorFusion } from '../src/simulation/sensorFusion';
import { generateScenario, spawnEntities } from '../src/simulation/scenarios';

describe('V5 synthetic sensor fusion', () => {
  it('is deterministic for the same seed and scenario', () => {
    const scenario = generateScenario(421, { entityCount: 4, backgroundActivity: .8 });
    const entities = spawnEntities(scenario);
    const a = new SensorFusion(scenario.seed);
    const b = new SensorFusion(scenario.seed);
    expect(a.observe(entities, scenario, 500)).toEqual(b.observe(entities, scenario, 500));
  });
  it('rate-limits ambiguous background returns instead of flooding tracks each frame', () => {
    const scenario = generateScenario(421, { entityCount: 5, backgroundActivity: .95 });
    const entities = spawnEntities(scenario);
    const fusion = new SensorFusion(scenario.seed);
    let ghosts = 0;
    for (let t = 50; t <= 8900; t += 50) {
      ghosts += fusion.observe(entities, scenario, t).filter(observation => observation.entityId === null).length;
    }
    expect(ghosts).toBeLessThanOrEqual(5);
  });
});
