import type { ScenarioDNA, SensorChannel, SensorObservation, SimEntity } from '../types';
import { SeededRng } from './rng';

export class SensorFusion {
  private rng: SeededRng;
  private lastGhostBucket = -1;
  constructor(seed: number) { this.rng = new SeededRng(seed ^ 0x6d2b79f5); }
  observe(entities: SimEntity[], scenario: ScenarioDNA, t: number): SensorObservation[] {
    const health = scenario.sensorHealth === 'NOMINAL' ? 1 : scenario.sensorHealth === 'DEGRADED' ? .68 : .38;
    const visibility = scenario.visibility === 'CLEAR' ? 1 : scenario.visibility === 'HAZY' ? .72 : .45;
    const out: SensorObservation[] = [];
    const channels: SensorChannel[] = ['VISUAL', 'RADAR_SYNTH', 'RF_LIKE', 'THERMAL_LIKE'];
    for (const entity of entities) {
      for (const source of channels) {
        const sourceFactor = source === 'VISUAL' ? visibility : source === 'THERMAL_LIKE' ? (scenario.timeOfDay === 'NIGHT' ? 1 : .7) : source === 'RF_LIKE' ? .78 : .9;
        const drop = this.rng.next();
        if (drop < (1 - health) * .24 + scenario.trackingDifficulty * .08) continue;
        const noise = (1 - health) * .8 + (1 - sourceFactor) * .35 + this.rng.range(0, scenario.ambiguity * .18);
        const confidence = Math.max(.08, Math.min(.98, entity.signature * .65 + sourceFactor * .25 + health * .18 - noise * .3));
        const jitter = noise * 4;
        // A measured synthetic signature is deliberately noisy and source-dependent;
        // downstream perception sees this observation, not the entity's true signature.
        const signature = Math.max(0, Math.min(1, entity.signature + this.rng.range(-noise * .55, noise * .55)));
        out.push({ id: `O-${source}-${entity.id}-${Math.floor(t)}`, entityId: entity.id, source, t, confidence, signature, x: entity.x + this.rng.range(-jitter, jitter), y: entity.y + this.rng.range(-jitter * .3, jitter * .3), z: entity.z + this.rng.range(-jitter, jitter), noise, health: health * sourceFactor, occluded: this.rng.next() < (1 - visibility) * .4, quality: confidence > .76 ? 'HIGH' : confidence > .48 ? 'MEDIUM' : 'LOW' });
      }
    }
    // False/ambiguous background returns are intentionally rate-limited. The old V2
    // code sampled a new ghost every 50 ms, which flooded the tracker with dozens of
    // duplicate false tracks. This version creates at most one candidate per time bucket.
    const ghostBucket = Math.floor(t / 1800);
    if (scenario.backgroundActivity > .3 && ghostBucket > this.lastGhostBucket) {
      this.lastGhostBucket = ghostBucket;
      if (this.rng.next() < scenario.backgroundActivity * .58) {
        const angle = this.rng.range(0, Math.PI * 2), radius = this.rng.range(25, 85);
        out.push({ id: `O-GHOST-${ghostBucket}`, entityId: null, source: this.rng.pick(channels), t, confidence: this.rng.range(.18, .5), x: Math.cos(angle) * radius, y: this.rng.range(10, 38), z: Math.sin(angle) * radius, noise: .65, health: .5, occluded: true, quality: 'LOW' });
      }
    }
    return out;
  }
}
