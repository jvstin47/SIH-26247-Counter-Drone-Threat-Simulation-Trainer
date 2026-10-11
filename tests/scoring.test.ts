import { describe, expect, it } from 'vitest';
import { scoreSession } from '../src/simulation/scoring';
import type { SimEntity, Track } from '../src/types';

const makeEntity = (category: SimEntity['category'], id: string): SimEntity => ({
  id, category, state: 'DETECTED', x: 0, y: 20, z: 0, vx: 0.8, vy: 0, vz: 0.4,
  ax: 0.01, az: 0.01, signature: 0.5, spawnT: 0, detectedAt: 100,
});
const makeTrack = (entityId: string, classification: Track['traineeClassification'], decision: Track['decision'], confidence = 0.9): Track => ({
  id: `T-${entityId}`, entityId, state: 'RESOLVED', confidence: 0.9,
  x: 0, y: 20, z: 0, vx: 0, vy: 0, vz: 0, lastSeen: 2000, ageMs: 0,
  sources: ['RADAR_SYNTH'], history: Array.from({ length: 20 }, (_, index) => ({ t: index * 100, x: 0, y: 20, z: 0, confidence: .9 })),
  traineeClassification: classification, traineeConfidence: confidence, decision,
});

describe('V4 scoring', () => {
  it('returns deterministic scores for identical input', () => {
    const entities = [makeEntity('BENIGN', 'E1'), makeEntity('TRAINING_A', 'E2')];
    const tracks = [makeTrack('E1', 'BENIGN', 'MONITOR'), makeTrack('E2', 'TRAINING_A', 'ESCALATE')];
    expect(scoreSession(entities, tracks, 5000)).toEqual(scoreSession(entities, tracks, 5000));
  });
  it('rewards correct synthetic answers', () => {
    const entities = [makeEntity('BENIGN', 'E1'), makeEntity('TRAINING_A', 'E2')];
    const correct = [makeTrack('E1', 'BENIGN', 'MONITOR'), makeTrack('E2', 'TRAINING_A', 'ESCALATE')];
    const incorrect = [makeTrack('E1', 'TRAINING_C', 'RESOLVE'), makeTrack('E2', 'BENIGN', 'MONITOR')];
    expect(scoreSession(entities, correct, 5000).classification).toBeGreaterThan(scoreSession(entities, incorrect, 5000).classification);
    expect(scoreSession(entities, correct, 5000).decision).toBeGreaterThan(scoreSession(entities, incorrect, 5000).decision);
  });
  it('does not let trainee responses overwrite ground truth', () => {
    const entity = makeEntity('BENIGN', 'E1');
    const result = scoreSession([entity], [makeTrack('E1', 'TRAINING_A', 'ESCALATE')], 5000);
    expect(entity.category).toBe('BENIGN');
    expect(result.classification).toBe(0);
    expect(result.decision).toBe(0);
  });
  it('penalizes missed contacts and false positive assessments', () => {
    const entity = makeEntity('BENIGN', 'E1');
    const fast = scoreSession([entity], [makeTrack('E1', 'BENIGN', 'MONITOR')], 5000);
    const slowEntity = { ...entity, detectedAt: 4900 };
    const slow = scoreSession([slowEntity], [makeTrack('E1', 'BENIGN', 'MONITOR')], 5000);
    const ghost = { ...makeTrack('ghost', 'TRAINING_A', 'ESCALATE'), entityId: null };
    const withGhost = scoreSession([entity], [makeTrack('E1', 'BENIGN', 'MONITOR'), ghost], 5000);
    expect(fast.detection).toBeGreaterThan(slow.detection);
    expect(withGhost.falsePositivePenalty).toBeGreaterThan(0);
  });
});
