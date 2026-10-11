import { describe, expect, it } from 'vitest';
import { generateScenario, spawnEntities, showcaseScenarios } from '../src/simulation/scenarios';

describe('seeded procedural scenario generation', () => {
  it('ships at least 20 distinct seeded showcase scenarios', () => {
    expect(showcaseScenarios.length).toBeGreaterThanOrEqual(20);
    expect(new Set(showcaseScenarios.map(scenario => scenario.id)).size).toBe(showcaseScenarios.length);
    expect(new Set(showcaseScenarios.map(scenario => scenario.seed)).size).toBe(showcaseScenarios.length);
  });
  it('produces repeatable scenario data from the same seed', () => {
    const one = generateScenario(48152);
    const two = generateScenario(48152);
    expect(one).toEqual(two);
    expect(spawnEntities(one)).toEqual(spawnEntities(two));
  });
  it('produces meaningfully different entity motion from a different seed', () => {
    expect(spawnEntities(generateScenario(1))).not.toEqual(spawnEntities(generateScenario(2)));
  });
  it('keeps entity count within the requested supported bounds', () => {
    const scenario = generateScenario(77, { entityCount: 9 });
    expect(spawnEntities(scenario)).toHaveLength(9);
  });
});
