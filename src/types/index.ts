export type ViewId =
  | 'command' | 'training' | 'tracking' | 'fusion' | 'scenario' | 'media'
  | 'aar' | 'history' | 'analytics' | 'unit' | 'system' | 'help';

export type Environment = 'URBAN' | 'RURAL' | 'OPEN' | 'INFRASTRUCTURE';
export type TimeOfDay = 'DAY' | 'NIGHT';
export type Visibility = 'CLEAR' | 'HAZY' | 'LOW';
export type SensorHealth = 'NOMINAL' | 'DEGRADED' | 'SEVERE';
export type EntityClass = 'BENIGN' | 'UNKNOWN' | 'TRAINING_A' | 'TRAINING_B' | 'TRAINING_C';
export type EntityState = 'AIRBORNE' | 'DETECTED' | 'CLASSIFIED' | 'RESOLVED';
export type TrackState = 'NEW' | 'ACQUIRED' | 'TRACKING' | 'UNCERTAIN' | 'LOST' | 'REACQUIRED' | 'CLASSIFIED' | 'RESOLVED';
export type DecisionAction = 'MONITOR' | 'TRACK' | 'ESCALATE' | 'MITIGATE' | 'RESOLVE';
export type SensorChannel = 'VISUAL' | 'RADAR_SYNTH' | 'RF_LIKE' | 'THERMAL_LIKE';

export interface ScenarioDNA {
  id: string; version: 2; seed: number; environment: Environment; timeOfDay: TimeOfDay;
  visibility: Visibility; sensorHealth: SensorHealth; entityCount: number; ambiguity: number;
  backgroundActivity: number; difficulty: number; scenarioDuration: number; eventDensity: number;
  mediaProfile: 'SENSOR_GRID' | 'AERIAL_DAY' | 'AERIAL_NIGHT' | 'NONE'; trackingDifficulty: number;
  sensorProfile: 'BASELINE' | 'DEGRADED' | 'SEVERE'; title: string; objective: string;
}

export interface SimEntity {
  id: string; category: EntityClass; state: EntityState;
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  ax: number; az: number; signature: number; spawnT: number;
  detectedAt?: number;
  /** Ground truth is category. Trainee responses are always stored separately. */
  traineeClassification?: EntityClass; traineeConfidence?: number; traineeDecision?: DecisionAction;
  /** Legacy V2 fields retained for reading prior sessions; V5 scoring never writes these. */
  classifiedAt?: number; decision?: DecisionAction; classification?: EntityClass; confidence?: number;
}

export interface SensorObservation {
  id: string; entityId: string | null; source: SensorChannel; t: number;
  confidence: number; signature?: number; x: number; y: number; z: number; noise: number;
  health: number; occluded: boolean; quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TrackPoint { t: number; x: number; y: number; z: number; confidence: number; }
export interface Track {
  id: string; entityId: string | null; state: TrackState; confidence: number; signature?: number;
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  lastSeen: number; ageMs: number; sources: SensorChannel[]; history: TrackPoint[];
  traineeClassification?: EntityClass; traineeConfidence?: number; decision?: DecisionAction;
}

export type TrainingEventType =
  | 'SESSION_STARTED' | 'ENTITY_SPAWNED' | 'OBSERVATION_CREATED' | 'TRACK_CREATED'
  | 'TRACK_ACQUIRED' | 'TRACK_LOST' | 'TRACK_REACQUIRED' | 'ENTITY_DETECTED'
  | 'CLASSIFICATION_SUBMITTED' | 'DECISION_SUBMITTED' | 'SENSOR_CHANGED'
  | 'MEDIA_CHANGED' | 'SCENARIO_COMPLETED' | 'PAUSED' | 'RESUMED' | 'REPLAY_KEYFRAME' | 'SENSOR_KEYFRAME';

export interface TrainingEvent { id: string; type: TrainingEventType; t: number; payload: Record<string, unknown>; }

export interface ScoreBreakdown {
  total: number; detection: number; classification: number; decision: number;
  confidenceCalibration: number; trackContinuity: number; completion: number; falsePositivePenalty: number;
}

export interface SessionRecord {
  id: string; profileId: string; startedAt: number; endedAt: number; scenario: ScenarioDNA;
  events: TrainingEvent[]; score: ScoreBreakdown; mistakes: string[]; strengths: string[];
  trackCount: number; mediaProfile: ScenarioDNA['mediaProfile']; durationMs: number;
}

export interface Profile { id: string; name: string; role: string; createdAt: number; archived?: boolean; }
export interface AppSettings { quality: 'HIGH' | 'BALANCED' | 'LOW'; simulationSpeed: number; reducedMotion: boolean; }
export interface SystemCapabilities {
  webgpu: boolean; webxr: boolean; storage: boolean; online: boolean; serviceWorker: boolean;
}

export interface EngineSnapshot {
  elapsedMs: number; entities: SimEntity[]; tracks: Track[]; observations: SensorObservation[];
  fps: number; phase: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETE'; sensorHealth: number; rendererBackend?: 'WEBGPU' | 'WEBGL';
}
