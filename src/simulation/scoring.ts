import type { DecisionAction, ScoreBreakdown, SessionRecord, SimEntity, Track } from '../types';

// This is a synthetic training policy, not an operational response/engagement rule set.
const expectedDecision: Record<string, DecisionAction> = {
  BENIGN: 'MONITOR', UNKNOWN: 'TRACK', TRAINING_A: 'ESCALATE', TRAINING_B: 'MITIGATE', TRAINING_C: 'RESOLVE',
};
const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function chooseRepresentativeTrack(tracks: Track[]) {
  const byEntity = new Map<string, Track>();
  for (const track of tracks) {
    if (!track.entityId) continue;
    const current = byEntity.get(track.entityId);
    const currentQuality = current ? Number(Boolean(current.decision)) * 10 + Number(Boolean(current.traineeClassification)) * 4 + current.history.length / 100 + current.confidence / 100 : -1;
    const candidateQuality = Number(Boolean(track.decision)) * 10 + Number(Boolean(track.traineeClassification)) * 4 + track.history.length / 100 + track.confidence / 100;
    if (!current || candidateQuality > currentQuality) byEntity.set(track.entityId, track);
  }
  return byEntity;
}

/**
 * Transparent deterministic scoring. Every metric is normalized against the set of
 * ground-truth entities, not merely the subset the trainee happened to answer.
 * Trainee values never write back to `SimEntity.category`.
 */
export function scoreSession(entities: SimEntity[], tracks: Track[], durationMs: number): ScoreBreakdown {
  const totalEntities = entities.length;
  if (!totalEntities) return { total: 0, detection: 0, classification: 0, decision: 0, confidenceCalibration: 0, trackContinuity: 0, completion: 0, falsePositivePenalty: 0 };

  const detected = entities.filter(entity => entity.detectedAt !== undefined);
  const detectionCoverage = detected.length / totalEntities;
  const meanLatency = detected.length
    ? detected.reduce((sum, entity) => sum + Math.max(0, entity.detectedAt ?? durationMs), 0) / detected.length
    : durationMs;
  const latencyRatio = Math.min(1, meanLatency / Math.max(1500, durationMs));
  const detection = clampScore(detectionCoverage * 70 + (1 - latencyRatio) * 30);

  const byEntity = chooseRepresentativeTrack(tracks);
  let classCorrect = 0, decisionCorrect = 0, confidenceTotal = 0, continuityTotal = 0, completed = 0;
  for (const entity of entities) {
    const track = byEntity.get(entity.id);
    if (!track) continue;
    if (track.history.length) continuityTotal += Math.min(1, track.history.length / 18) * track.confidence;
    if (track.traineeClassification !== undefined) {
      const correct = track.traineeClassification === entity.category;
      if (correct) classCorrect++;
      confidenceTotal += 1 - Math.abs((correct ? 1 : 0) - (track.traineeConfidence ?? 0.5));
    }
    if (track.decision !== undefined) {
      completed++;
      if (expectedDecision[entity.category] === track.decision) decisionCorrect++;
    }
  }
  // Missing classifications/decisions remain in each denominator, so skipping hard
  // contacts cannot artificially inflate a trainee's accuracy.
  const classification = clampScore(classCorrect / totalEntities * 100);
  const decision = clampScore(decisionCorrect / totalEntities * 100);
  const calibration = clampScore(confidenceTotal / totalEntities * 100);
  const continuity = clampScore(continuityTotal / totalEntities * 100);
  const completion = clampScore(completed / totalEntities * 100);
  const falsePositiveTracks = tracks.filter(track => !track.entityId && track.traineeClassification !== undefined);
  const falsePositivePenalty = Math.min(24, falsePositiveTracks.filter(track => track.traineeClassification !== 'BENIGN').length * 6);
  const total = clampScore(
    detection * .22 + classification * .27 + decision * .24 + calibration * .12 + continuity * .10 + completion * .05 - falsePositivePenalty,
  );
  return { total, detection, classification, decision, confidenceCalibration: calibration, trackContinuity: continuity, completion, falsePositivePenalty };
}

export function summarizeSession(session: SessionRecord): Pick<SessionRecord, 'mistakes' | 'strengths'> {
  const score = session.score;
  const mistakes: string[] = [];
  const strengths: string[] = [];
  if (score.detection < 72) mistakes.push('Acquire observable contacts earlier and maintain awareness of the timeline.');
  else strengths.push('Detection timing and coverage were consistent during this run.');
  if (score.classification < 75) mistakes.push('Review uncertain classifications and compare confidence with the available evidence.');
  else strengths.push('Classification decisions aligned well with the synthetic ground truth.');
  if (score.trackContinuity < 70) mistakes.push('Practice maintaining a stable track when observations become intermittent.');
  else strengths.push('Track continuity remained strong across the observed intervals.');
  if (score.confidenceCalibration < 72) mistakes.push('Calibrate confidence more conservatively when evidence quality is low.');
  else strengths.push('Confidence was reasonably aligned with correctness.');
  if (score.falsePositivePenalty > 0) mistakes.push('Review ambiguous contacts before making a non-benign classification.');
  return { mistakes, strengths };
}

export function expectedDecisionFor(category: SimEntity['category']) { return expectedDecision[category]; }
