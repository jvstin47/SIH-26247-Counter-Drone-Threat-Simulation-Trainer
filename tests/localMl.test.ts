import { describe, expect, it } from 'vitest';
import { predictSyntheticEntity, predictSyntheticTrack, localModelStatus } from '../src/simulation/localMl';
import { spawnEntities, generateScenario } from '../src/simulation/scenarios';
import type { Track } from '../src/types';

const fixtureTrack: Track = {
  id: 'T-101', entityId: null, state: 'TRACKING', confidence: .62,
  x: 4, y: 20, z: 6, vx: 1.2, vy: 0, vz: .7, lastSeen: 500, ageMs: 0,
  sources: ['VISUAL', 'RADAR_SYNTH'],
  history: Array.from({ length: 4 }, (_, index) => ({ t: index * 100, x: index * .12, y: 20, z: index * .07, confidence: .62 })),
};

describe('local synthetic classifier', () => {
  it('trains a deterministic local model and returns a normalized distribution', () => {
    const entity = spawnEntities(generateScenario(199))[0];
    const a = predictSyntheticEntity(entity);
    const b = predictSyntheticEntity(entity);
    expect(a.provider).toBe('LOCAL-SYNTHETIC-LOGREG');
    expect(a.label).toBe(b.label);
    expect(a.confidence).toBeGreaterThan(0);
    expect(Object.values(a.distribution).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 2);
    expect(localModelStatus().trained).toBe(true);
  });
  it('infers only from the observed track vector', () => {
    const prediction = predictSyntheticTrack(fixtureTrack);
    expect(prediction.label).toBeTruthy();
    expect(prediction.confidence).toBeGreaterThan(0);
    expect(prediction.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
