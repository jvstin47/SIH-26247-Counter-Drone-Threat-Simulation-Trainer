import type { EntityClass, SimEntity, Track } from '../types';
import { SeededRng } from './rng';

export interface LocalPrediction {
  label: EntityClass;
  confidence: number;
  distribution: Record<EntityClass, number>;
  provider: 'LOCAL-SYNTHETIC-LOGREG';
  latencyMs: number;
}

const labels: EntityClass[] = ['BENIGN', 'UNKNOWN', 'TRAINING_A', 'TRAINING_B', 'TRAINING_C'];
type Features = [number, number, number, number];
type Weights = number[][];
type FeatureInput = Pick<SimEntity, 'signature' | 'vx' | 'vz' | 'y' | 'ax' | 'az'>;

const ranges: Record<EntityClass, { signature: [number, number]; speed: [number, number]; altitude: [number, number]; acceleration: [number, number] }> = {
  BENIGN: { signature: [.12, .42], speed: [.25, 1.35], altitude: [10, 25], acceleration: [.005, .045] },
  UNKNOWN: { signature: [.32, .68], speed: [.4, 2.5], altitude: [12, 36], acceleration: [.01, .07] },
  TRAINING_A: { signature: [.58, .96], speed: [1.65, 3.7], altitude: [14, 42], acceleration: [.02, .1] },
  TRAINING_B: { signature: [.36, .82], speed: [.7, 2.65], altitude: [23, 44], acceleration: [.01, .08] },
  TRAINING_C: { signature: [.16, .64], speed: [.2, 1.9], altitude: [29, 45], acceleration: [.005, .065] },
};

function featureVector(input: FeatureInput): Features {
  return [
    Math.max(0, Math.min(1, input.signature)),
    Math.max(0, Math.min(1, Math.hypot(input.vx, input.vz) / 4)),
    Math.max(0, Math.min(1, input.y / 50)),
    Math.max(0, Math.min(1, Math.hypot(input.ax, input.az) / .15)),
  ];
}
function softmax(logits: number[]) {
  const max = Math.max(...logits);
  const exp = logits.map(value => Math.exp(Math.max(-30, Math.min(30, value - max))));
  const total = exp.reduce((sum, value) => sum + value, 0) || 1;
  return exp.map(value => value / total);
}
function trainSyntheticModel(): Weights {
  const rng = new SeededRng(0x4a1dc25);
  const samples: { x: Features; y: number }[] = [];
  // A compact multinomial logistic model is fit on generated feature vectors only.
  // There are no external datasets, cloud calls, or hidden ground-truth reads at inference.
  labels.forEach((label, y) => {
    const range = ranges[label];
    for (let i = 0; i < 180; i++) {
      samples.push({ x: [rng.range(...range.signature), rng.range(...range.speed) / 4, rng.range(...range.altitude) / 50, rng.range(...range.acceleration) / .15], y });
    }
  });
  const featureCount = 5;
  const weights = labels.map(() => Array.from({ length: featureCount }, () => rng.range(-.08, .08)));
  for (let epoch = 0; epoch < 150; epoch++) {
    const gradients = labels.map(() => Array.from({ length: featureCount }, () => 0));
    for (const sample of samples) {
      const input = [...sample.x, 1];
      const probabilities = softmax(weights.map(row => row.reduce((sum, weight, idx) => sum + weight * input[idx], 0)));
      for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
        const error = probabilities[labelIndex] - (labelIndex === sample.y ? 1 : 0);
        for (let j = 0; j < featureCount; j++) gradients[labelIndex][j] += error * input[j];
      }
    }
    const scale = .18 / samples.length;
    for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
      for (let j = 0; j < featureCount; j++) {
        const regularization = j === featureCount - 1 ? 0 : weights[labelIndex][j] * .002;
        weights[labelIndex][j] -= scale * gradients[labelIndex][j] + regularization;
      }
    }
  }
  return weights;
}
let cachedWeights: Weights | null = null;
function getWeights() { cachedWeights ??= trainSyntheticModel(); return cachedWeights; }
function infer(input: FeatureInput): LocalPrediction {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const features = [...featureVector(input), 1];
  const probabilities = softmax(getWeights().map(row => row.reduce((sum, weight, idx) => sum + weight * features[idx], 0)));
  const winning = probabilities.reduce((best, value, index) => value > probabilities[best] ? index : best, 0);
  const distribution = Object.fromEntries(labels.map((label, index) => [label, Number(probabilities[index].toFixed(4))])) as Record<EntityClass, number>;
  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { label: labels[winning], confidence: probabilities[winning], distribution, provider: 'LOCAL-SYNTHETIC-LOGREG', latencyMs: Math.max(0, end - start) };
}

export function predictSyntheticEntity(entity: SimEntity): LocalPrediction {
  return infer(entity);
}

/** Infer only from the observed track state; this path does not use entityId/category. */
export function predictSyntheticTrack(track: Track): LocalPrediction {
  let acceleration = 0;
  if (track.history.length >= 3) {
    const last = track.history[track.history.length - 1];
    const previous = track.history[track.history.length - 2];
    const prior = track.history[track.history.length - 3];
    const dt1 = Math.max(1, last.t - previous.t) / 1000;
    const dt2 = Math.max(1, previous.t - prior.t) / 1000;
    const vx1 = (last.x - previous.x) / dt1;
    const vz1 = (last.z - previous.z) / dt1;
    const vx2 = (previous.x - prior.x) / dt2;
    const vz2 = (previous.z - prior.z) / dt2;
    acceleration = Math.min(.15, Math.hypot(vx1 - vx2, vz1 - vz2) / Math.max(.05, (dt1 + dt2) / 2));
  }
  return infer({ signature: track.signature ?? track.confidence, vx: track.vx, vz: track.vz, y: track.y, ax: acceleration, az: 0 });
}

export function localModelStatus() {
  return { trained: cachedWeights !== null, provider: 'LOCAL-SYNTHETIC-LOGREG' as const, classes: labels.length, samplesPerClass: 180 };
}
