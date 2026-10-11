import { describe, expect, it } from 'vitest';
import { TrackManager } from '../src/simulation/tracking';
import type { SensorObservation } from '../src/types';

const observation = (id: string, t: number, x: number, source: SensorObservation['source'] = 'RADAR_SYNTH', entityId: string | null = 'E-01'): SensorObservation => ({
  id, entityId, source, t, x, y: 20, z: 4, confidence: .8, noise: .1, health: 1, occluded: false, quality: 'HIGH',
});

describe('V5 deterministic synthetic tracking', () => {
  it('associates nearby source observations into one history-bearing track', () => {
    const tracker = new TrackManager();
    const first = tracker.update([observation('o1', 50, 3)], 50, 50, .4);
    const second = tracker.update([observation('o2', 100, 3.5, 'VISUAL'), observation('o3', 100, 3.4, 'RF_LIKE')], 50, 100, .4);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second[0].history.length).toBe(2); // one history point per tick, not per sensor
    expect(second[0].sources).toContain('VISUAL');
    expect(second[0].sources).toContain('RF_LIKE');
  });
  it('keeps a false return without ground-truth entity association', () => {
    const tracker = new TrackManager();
    const [track] = tracker.update([observation('ghost', 50, 60, 'RADAR_SYNTH', null)], 50, 50, .4);
    const tracks = tracker.update([observation('nearby-observation', 100, 60.4, 'VISUAL', 'E-09')], 50, 100, .4);
    expect(tracker.get(track.id)?.entityId).toBeNull();
    expect(tracks).toHaveLength(2);
    expect(tracks.find(item => item.entityId === 'E-09')).toBeDefined();
  });


  it('keeps nearby but distinct entity identities in separate tracks', () => {
    const tracker = new TrackManager();
    const tracks = tracker.update([
      observation('e1-radar', 50, 0, 'RADAR_SYNTH', 'E-01'),
      observation('e2-radar', 50, 0.2, 'RADAR_SYNTH', 'E-02'),
    ], 50, 50, .9);
    expect(tracks).toHaveLength(2);
    expect(new Set(tracks.map(track => track.entityId))).toEqual(new Set(['E-01', 'E-02']));
  });

  it('preserves classified and resolved lifecycle states while fresh observations arrive', () => {
    const tracker = new TrackManager();
    const [track] = tracker.update([observation('o1', 50, 10)], 50, 50, .2);
    tracker.setTraineeClassification(track.id, 'BENIGN', .9);
    tracker.update([observation('o2', 100, 10.2)], 50, 100, .2);
    expect(tracker.get(track.id)?.state).toBe('CLASSIFIED');
    tracker.setDecision(track.id, 'RESOLVE');
    tracker.update([observation('o3', 150, 10.4)], 50, 150, .2);
    expect(tracker.get(track.id)?.state).toBe('RESOLVED');
  });

  it('keeps classified/resolved tracks moving with their entity without reverting state', () => {
    const tracker = new TrackManager();
    const [track] = tracker.update([observation('o1', 50, 0)], 50, 50, .2);
    tracker.setTraineeClassification(track.id, 'BENIGN', .9);
    tracker.setDecision(track.id, 'MONITOR');
    const xBefore = tracker.get(track.id)!.x;
    tracker.update([observation('o2', 100, 2)], 50, 100, .2);
    const updated = tracker.get(track.id)!;
    expect(updated.state).toBe('RESOLVED');
    expect(updated.x).toBeGreaterThan(xBefore);
    expect(updated.history.length).toBeGreaterThan(1);
    expect(tracker.getAll()).toHaveLength(1);
  });

  it('marks an unobserved track lost after the configured timeout', () => {
    const tracker = new TrackManager();
    const [track] = tracker.update([observation('o1', 50, 0)], 50, 50, .2);
    tracker.update([], 6000, 6050, .2);
    expect(tracker.get(track.id)?.state).toBe('LOST');
  });
});
