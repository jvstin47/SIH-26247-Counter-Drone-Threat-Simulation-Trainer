import type { DecisionAction, EntityClass, SensorObservation, Track } from '../types';

const MAX_HISTORY = 90;
const MAX_SYNTHETIC_SPEED = 80;

type PredictedState = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  lifecycle: Track['state'];
};

/**
 * Deterministic identity-gated nearest-neighbour tracking with a lightweight
 * alpha-beta-style estimator. One history sample and one velocity update are
 * produced per track per simulation tick even when several sensors observe it.
 */
export class TrackManager {
  private tracks = new Map<string, Track>();
  private nextId = 1;

  update(observations: SensorObservation[], dt: number, now: number, difficulty: number): Track[] {
    const maxAge = 2600 + difficulty * 2400;
    const predicted = new Map<string, PredictedState>();

    // Fixed-step prediction runs exactly once per track per tick.
    for (const track of this.tracks.values()) {
      const decisionLocked = track.state === 'RESOLVED' || track.state === 'CLASSIFIED';
      track.ageMs += dt;
      track.x += track.vx * dt / 1000;
      track.y += track.vy * dt / 1000;
      track.z += track.vz * dt / 1000;
      if (!decisionLocked) {
        if (track.ageMs > maxAge) track.state = 'LOST';
        else if (track.state !== 'NEW' && track.state !== 'ACQUIRED') track.state = 'UNCERTAIN';
      }
      predicted.set(track.id, {
        x: track.x, y: track.y, z: track.z,
        vx: track.vx, vy: track.vy, vz: track.vz,
        lifecycle: track.state,
      });
    }

    const updatedIds = new Set<string>();
    for (const observation of observations) {
      let best: Track | undefined;
      let bestDistance = Infinity;
      // Identity is a hard constraint in this synthetic simulator. Distinct known
      // entities and null-ID ghost returns can never merge due only to proximity.
      for (const track of this.tracks.values()) {
        if (track.entityId !== observation.entityId) continue;
        const dx = track.x - observation.x;
        const dy = track.y - observation.y;
        const dz = track.z - observation.z;
        const distance = Math.hypot(dx, dy, dz);
        const gate = 10 + difficulty * 12 + observation.noise * 3;
        if (distance < bestDistance && distance < gate) {
          best = track;
          bestDistance = distance;
        }
      }

      if (!best) {
        const id = `T-${String(this.nextId++).padStart(3, '0')}`;
        best = {
          id,
          entityId: observation.entityId,
          state: 'NEW',
          confidence: Math.max(0.05, observation.confidence * 0.78),
          signature: Math.max(0, Math.min(1, observation.signature ?? observation.confidence)),
          x: observation.x, y: observation.y, z: observation.z,
          vx: 0, vy: 0, vz: 0,
          lastSeen: now, ageMs: 0,
          sources: [observation.source],
          history: [],
        };
        this.tracks.set(id, best);
        best.state = 'ACQUIRED';
      } else {
        const protectedState = best.state === 'RESOLVED' || best.state === 'CLASSIFIED';
        const wasUpdatedThisTick = updatedIds.has(best.id);
        const alpha = 0.24 + Math.max(0, Math.min(1, observation.confidence)) * 0.52;
        const prior = predicted.get(best.id);
        if (!wasUpdatedThisTick && prior && dt > 0) {
          // First observation in the tick corrects the predicted position and updates
          // velocity once. Additional channels only refine position/confidence.
          const dx = observation.x - prior.x;
          const dy = observation.y - prior.y;
          const dz = observation.z - prior.z;
          best.x = prior.x + alpha * dx;
          best.y = prior.y + alpha * dy;
          best.z = prior.z + alpha * dz;
          const beta = 0.08 + observation.confidence * 0.06;
          const seconds = dt / 1000;
          best.vx = Math.max(-MAX_SYNTHETIC_SPEED, Math.min(MAX_SYNTHETIC_SPEED, prior.vx + beta * dx / seconds));
          best.vy = Math.max(-MAX_SYNTHETIC_SPEED, Math.min(MAX_SYNTHETIC_SPEED, prior.vy + beta * dy / seconds));
          best.vz = Math.max(-MAX_SYNTHETIC_SPEED, Math.min(MAX_SYNTHETIC_SPEED, prior.vz + beta * dz / seconds));
        } else {
          const secondaryAlpha = alpha * 0.35;
          best.x += secondaryAlpha * (observation.x - best.x);
          best.y += secondaryAlpha * (observation.y - best.y);
          best.z += secondaryAlpha * (observation.z - best.z);
        }
        best.confidence = Math.max(best.confidence * 0.82, observation.confidence);
        const observedSignature = Math.max(0, Math.min(1, observation.signature ?? observation.confidence));
        const signatureAlpha = wasUpdatedThisTick ? 0.12 : 0.28;
        best.signature = Math.max(0, Math.min(1, (best.signature ?? observedSignature) * (1 - signatureAlpha) + observedSignature * signatureAlpha));
        if (!protectedState) {
          // REACQUIRED lasts for one complete tick even if multiple sensor sources
          // contribute observations in the same batch.
          best.state = prior?.lifecycle === 'LOST' ? 'REACQUIRED' : 'TRACKING';
        }
        if (!best.sources.includes(observation.source)) best.sources.push(observation.source);
        best.lastSeen = now;
        best.ageMs = 0;
      }
      updatedIds.add(best.id);
      if (best.state === 'NEW') best.state = 'ACQUIRED';
    }

    // History is one sample per tick, rather than one per sensor observation.
    for (const id of updatedIds) {
      const track = this.tracks.get(id);
      if (!track) continue;
      track.history.push({ t: now, x: track.x, y: track.y, z: track.z, confidence: track.confidence });
      if (track.history.length > MAX_HISTORY) track.history.shift();
    }

    return this.getAll();
  }

  get(id: string) { return this.tracks.get(id); }
  getAll() { return Array.from(this.tracks.values()).map(t => ({ ...t, sources: [...t.sources], history: [...t.history] })); }

  acquire(id: string) {
    const track = this.tracks.get(id);
    if (track && (track.state === 'NEW' || track.state === 'TRACKING' || track.state === 'UNCERTAIN' || track.state === 'REACQUIRED')) {
      track.state = 'ACQUIRED';
    }
  }

  setTraineeClassification(id: string, classification: EntityClass, confidence: number) {
    const track = this.tracks.get(id);
    if (!track) return;
    track.traineeClassification = classification;
    track.traineeConfidence = Math.max(0.1, Math.min(1, confidence));
    if (track.state !== 'RESOLVED') track.state = 'CLASSIFIED';
  }

  setDecision(id: string, decision: DecisionAction) {
    const track = this.tracks.get(id);
    if (!track) return;
    track.decision = decision;
    track.state = 'RESOLVED';
  }

  clear() { this.tracks.clear(); this.nextId = 1; }
}
