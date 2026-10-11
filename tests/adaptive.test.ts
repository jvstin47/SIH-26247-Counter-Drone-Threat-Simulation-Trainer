import { describe, expect, it } from 'vitest';
import { nextDifficulty, recommendScenario } from '../src/simulation/adaptive';
import type { SessionRecord } from '../src/types';

const session = (score: number): SessionRecord => ({
  id: `s-${score}`, profileId: 'profile-default', startedAt: 1, endedAt: 2,
  scenario: { id: 'x', version: 2, seed: 1, environment: 'URBAN', timeOfDay: 'DAY', visibility: 'CLEAR', sensorHealth: 'NOMINAL', entityCount: 4, ambiguity: .3, backgroundActivity: .3, difficulty: .5, scenarioDuration: 60, eventDensity: .5, mediaProfile: 'AERIAL_DAY', trackingDifficulty: .4, sensorProfile: 'BASELINE', title: 'Test', objective: 'Test' },
  events: [], score: { total: score, detection: score, classification: score, decision: score, confidenceCalibration: score, trackContinuity: score, completion: 100, falsePositivePenalty: 0 },
  mistakes: [], strengths: [], trackCount: 4, mediaProfile: 'AERIAL_DAY', durationMs: 2000,
});

describe('adaptive training', () => {
  it('raises difficulty after strong repeated performance', () => expect(nextDifficulty([session(94), session(91)], .6)).toBeGreaterThan(.6));
  it('reduces difficulty after repeated underperformance', () => expect(nextDifficulty([session(50), session(58)], .6)).toBeLessThan(.6));
  it('keeps generated difficulty bounded', () => expect(recommendScenario([], session(98).score, 123).difficulty).toBeGreaterThanOrEqual(.2));
});
