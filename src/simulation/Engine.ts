import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine as BabylonEngine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  WebGPUEngine,
} from '@babylonjs/core';
import type {
  DecisionAction,
  EngineSnapshot,
  EntityClass,
  ScenarioDNA,
  SensorHealth,
  SimEntity,
  SensorObservation,
  Track,
  TrainingEvent,
  TrainingEventType,
} from '../types';
import { spawnEntities } from './scenarios';
import { SeededRng } from './rng';
import { SensorFusion } from './sensorFusion';
import { TrackManager } from './tracking';

type RendererBackend = 'WEBGPU' | 'WEBGL';
type Renderer = BabylonEngine | WebGPUEngine;

/**
 * Deterministic synthetic training engine. Simulation truth is isolated from trainee
 * answers. Babylon renders the world; it does not decide classification/scoring truth.
 */
export class SimulationEngine {
  private be: Renderer;
  private backend: RendererBackend;
  private scene: Scene;
  private scenario: ScenarioDNA;
  private entities: SimEntity[];
  private tracks: Track[] = [];
  private observations: SensorObservation[] = [];
  private fusion: SensorFusion;
  private tracker = new TrackManager();
  private meshes = new Map<string, Mesh>();
  private trails = new Map<string, any>();
  private listeners = new Set<(s: EngineSnapshot) => void>();
  private eventListeners = new Set<(e: TrainingEvent) => void>();
  private raf = 0;
  private fixedStep = 50;
  private accumulator = 0;
  private xrExperience: { baseExperience?: { enterXRAsync: (mode: 'immersive-vr', referenceSpace: 'local-floor') => Promise<unknown>; exitXRAsync?: () => Promise<unknown> } } | null = null;
  private last = performance.now();
  private lastSnapshotAt = 0;
  private lastObservationEventAt = 0;
  private elapsedMs = 0;
  private phase: EngineSnapshot['phase'] = 'IDLE';
  private selectedTrackId: string | null = null;
  private seq = 0;
  private speed = 1;
  private lastKeyframe = 0;
  private currentSensorHealth: SensorHealth;
  private degradationTriggered = false;
  private spawnedEntityIds = new Set<string>();
  private disposed = false;
  private camera: ArcRotateCamera;
  private ground!: Mesh;

  static async create(canvas: HTMLCanvasElement, scenario: ScenarioDNA): Promise<SimulationEngine> {
    // Try WebGPU first, but never let it block training on a browser/device where it
    // is unavailable or partially implemented. WebGL remains the dependable path.
    const gpuAvailable = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (gpuAvailable) {
      try {
        const gpu = new WebGPUEngine(canvas, { antialias: true, adaptToDeviceRatio: true });
        await gpu.initAsync();
        return new SimulationEngine(canvas, scenario, gpu, 'WEBGPU');
      } catch (error) {
        console.warn('[AID-C2S] WebGPU init failed; falling back to WebGL.', error);
      }
    }
    const webgl = new BabylonEngine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    return new SimulationEngine(canvas, scenario, webgl, 'WEBGL');
  }

  private constructor(canvas: HTMLCanvasElement, scenario: ScenarioDNA, renderer: Renderer, backend: RendererBackend) {
    this.scenario = scenario;
    this.be = renderer;
    this.backend = backend;
    this.currentSensorHealth = scenario.sensorHealth;
    this.fusion = new SensorFusion(scenario.seed);
    this.scene = new Scene(this.be);
    this.scene.clearColor = new Color4(0.018, 0.020, 0.024, 1);
    this.entities = spawnEntities(scenario).map((e) => ({ ...e }));

    this.camera = new ArcRotateCamera(
      'aid-camera', -Math.PI / 2.3, Math.PI / 3.15, 132, new Vector3(0, 13, 0), this.scene,
    );
    this.camera.lowerRadiusLimit = 38;
    this.camera.upperRadiusLimit = 220;
    this.camera.wheelPrecision = 28;
    this.camera.panningSensibility = 70;
    this.camera.attachControl(canvas, true);

    const hemi = new HemisphericLight('aid-hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = scenario.timeOfDay === 'NIGHT' ? 0.82 : 1.05;
    hemi.diffuse = new Color3(0.82, 0.84, 0.89);
    hemi.groundColor = new Color3(0.16, 0.17, 0.20);
    const key = new DirectionalLight('aid-key', new Vector3(-0.45, -1, 0.32), this.scene);
    key.intensity = scenario.timeOfDay === 'NIGHT' ? 0.48 : 0.78;
    key.diffuse = new Color3(0.9, 0.91, 0.96);

    this.scene.fogMode = Scene.FOGMODE_EXP;
    this.scene.fogDensity = scenario.visibility === 'LOW' ? 0.012 : scenario.visibility === 'HAZY' ? 0.0055 : 0.0014;
    this.scene.fogColor = new Color3(0.025, 0.027, 0.030);

    this.buildWorld();
    this.applyLegibilityBoost();
    this.emitSnapshot();
    this.tick(performance.now());
  }

  getRendererBackend(): RendererBackend { return this.backend; }
  getElapsedMs() { return Math.round(this.elapsedMs); }
  getPhase() { return this.phase; }

  private applyLegibilityBoost() {
    // Monochrome does not mean black-on-black: lift the ambient floor so contacts,
    // terrain silhouettes and datum geometry remain visible on ordinary laptop panels.
    this.scene.clearColor = new Color4(0.012, 0.013, 0.016, 1);
    this.scene.fogColor = new Color3(0.028, 0.030, 0.035);
    this.scene.ambientColor = new Color3(0.16, 0.16, 0.18);
    for (const light of this.scene.lights) light.intensity = Math.max(light.intensity, 0.58);
    for (const mesh of this.scene.meshes) {
      if (!(mesh.material instanceof StandardMaterial)) continue;
      const material = mesh.material;
      material.diffuseColor = new Color3(
        Math.max(material.diffuseColor.r, 0.065),
        Math.max(material.diffuseColor.g, 0.067),
        Math.max(material.diffuseColor.b, 0.072),
      );
      material.emissiveColor = new Color3(
        Math.max(material.emissiveColor.r, 0.018),
        Math.max(material.emissiveColor.g, 0.019),
        Math.max(material.emissiveColor.b, 0.022),
      );
    }
  }

  private buildWorld() {
    const ground = MeshBuilder.CreateGround('aid-ground', { width: 240, height: 240, subdivisions: 1 }, this.scene);
    this.ground = ground;
    const groundMat = new StandardMaterial('aid-ground-mat', this.scene);
    groundMat.diffuseColor = new Color3(0.035, 0.037, 0.041);
    groundMat.emissiveColor = new Color3(0.018, 0.019, 0.022);
    groundMat.specularColor = new Color3(0.04, 0.04, 0.05);
    ground.material = groundMat;

    // Fine grid + bright 10-unit datum lines improve depth perception without
    // expensive textures. The heavy grid remains monochrome and procedural.
    for (let i = -110; i <= 110; i += 10) {
      const major = i % 50 === 0;
      const c = major ? new Color3(0.21, 0.22, 0.25) : new Color3(0.105, 0.11, 0.125);
      const a = MeshBuilder.CreateLines(`grid-x-${i}`, {
        points: [new Vector3(i, 0.035, -110), new Vector3(i, 0.035, 110)],
      }, this.scene);
      a.color = c;
      const b = MeshBuilder.CreateLines(`grid-z-${i}`, {
        points: [new Vector3(-110, 0.035, i), new Vector3(110, 0.035, i)],
      }, this.scene);
      b.color = c;
    }

    // Central concentric datum rings. They are visual reference geometry only.
    [14, 30, 52].forEach((diameter, index) => {
      const ring = MeshBuilder.CreateTorus(`datum-${diameter}`, {
        diameter, thickness: index === 0 ? 0.13 : 0.075, tessellation: 96,
      }, this.scene);
      ring.position.y = 0.08;
      const mat = new StandardMaterial(`datum-mat-${diameter}`, this.scene);
      mat.diffuseColor = new Color3(0.16, 0.17, 0.19);
      mat.emissiveColor = new Color3(index === 0 ? 0.12 : 0.055, index === 0 ? 0.12 : 0.055, index === 0 ? 0.14 : 0.06);
      mat.specularColor = Color3.Black();
      ring.material = mat;
    });

    const count = this.scenario.environment === 'URBAN' ? 72
      : this.scenario.environment === 'INFRASTRUCTURE' ? 48
      : this.scenario.environment === 'RURAL' ? 34 : 18;
    const r = new SeededRng(this.scenario.seed ^ 0xa5a5);
    for (let i = 0; i < count; i++) {
      const x = r.range(-100, 100), z = r.range(-100, 100);
      if (Math.abs(x) < 19 && Math.abs(z) < 19) continue;
      const urban = this.scenario.environment === 'URBAN';
      const w = r.range(3, urban ? 12 : 6);
      const h = urban ? r.range(3, 23) : r.range(1.5, 5.5);
      const d = r.range(3, urban ? 12 : 6);
      const box = MeshBuilder.CreateBox(`structure-${i}`, { width: w, depth: d, height: h }, this.scene);
      box.position = new Vector3(x, h / 2, z);
      const mat = new StandardMaterial(`structure-mat-${i}`, this.scene);
      mat.diffuseColor = new Color3(0.055, 0.058, 0.065);
      mat.emissiveColor = new Color3(0.018, 0.019, 0.023);
      mat.specularColor = new Color3(0.025, 0.025, 0.03);
      box.material = mat;

      // Sparse roof lights give the night environment depth, without external assets.
      if (this.scenario.timeOfDay === 'NIGHT' && i % 7 === 0) {
        const marker = MeshBuilder.CreateBox(`roof-marker-${i}`, { width: 0.28, height: 0.18, depth: 0.28 }, this.scene);
        marker.position = new Vector3(x, h + 0.1, z);
        const mm = new StandardMaterial(`roof-marker-mat-${i}`, this.scene);
        mm.emissiveColor = new Color3(0.56, 0.56, 0.62);
        mm.diffuseColor = new Color3(0.42, 0.42, 0.48);
        marker.material = mm;
      }
    }

    for (const entity of this.entities) {
      const mesh = MeshBuilder.CreatePolyhedron(`entity-${entity.id}`, { type: 1, size: 2.45 }, this.scene);
      mesh.position = new Vector3(entity.x, entity.y, entity.z);
      mesh.setEnabled(false); // All contacts are introduced at their deterministic spawn time.
      const mat = new StandardMaterial(`entity-mat-${entity.id}`, this.scene);
      mat.diffuseColor = new Color3(0.82, 0.83, 0.88);
      mat.emissiveColor = new Color3(0.24, 0.25, 0.29);
      mat.specularColor = new Color3(0.4, 0.4, 0.45);
      mesh.material = mat;
      this.meshes.set(entity.id, mesh);

      // Vertical datum guide connects the contact to its projected ground point.
      const guide = MeshBuilder.CreateLines(`entity-guide-${entity.id}`, {
        points: [new Vector3(entity.x, 0.1, entity.z), new Vector3(entity.x, entity.y, entity.z)],
        updatable: true,
      }, this.scene);
      guide.color = new Color3(0.18, 0.19, 0.22);
      guide.setEnabled(false);
      this.trails.set(`guide-${entity.id}`, guide);
    }
  }

  onSnapshot(fn: (s: EngineSnapshot) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onEvent(fn: (e: TrainingEvent) => void) { this.eventListeners.add(fn); return () => this.eventListeners.delete(fn); }
  getEntities() { return this.entities.map(e => ({ ...e })); }
  getTracks() { return this.tracks.map(t => ({ ...t, history: [...t.history], sources: [...t.sources] })); }
  getObservations() { return this.observations.map(o => ({ ...o })); }

  private emit(type: TrainingEventType, payload: Record<string, unknown>) {
    const e: TrainingEvent = { id: `evt-${++this.seq}`, type, t: Math.round(this.elapsedMs), payload };
    for (const listener of this.eventListeners) listener(e);
  }

  start() {
    if (this.phase === 'RUNNING' || this.phase === 'COMPLETE') return;
    this.phase = 'RUNNING';
    this.last = performance.now();
    this.emit('SESSION_STARTED', { scenarioId: this.scenario.id, seed: this.scenario.seed, renderer: this.backend });
    this.emit('SENSOR_CHANGED', { health: this.currentSensorHealth, visibility: this.scenario.visibility });
    this.spawnDueEntities();
    this.emitSnapshot();
  }
  pause() { if (this.phase === 'RUNNING') { this.phase = 'PAUSED'; this.emit('PAUSED', {}); this.emitSnapshot(); } }
  resume() { if (this.phase === 'PAUSED') { this.phase = 'RUNNING'; this.last = performance.now(); this.emit('RESUMED', {}); this.emitSnapshot(); } }
  stop() {
    if (this.phase === 'COMPLETE') return;
    this.phase = 'COMPLETE';
    this.emit('SCENARIO_COMPLETED', { durationMs: Math.round(this.elapsedMs) });
    this.emitSnapshot();
  }
  setSimulationSpeed(speed: number) { this.speed = Math.max(0.25, Math.min(4, speed)); }
  setQuality(quality: 'HIGH' | 'BALANCED' | 'LOW') {
    const level = quality === 'HIGH' ? 1 : quality === 'BALANCED' ? 1.25 : 1.6;
    this.be.setHardwareScalingLevel(level);
  }

  /** Select a track ID (T-xxx), not an entity ID (E-xx). */
  selectTrack(trackId: string) {
    const track = this.tracker.get(trackId);
    if (!track) return;
    this.selectedTrackId = trackId;
    this.tracker.acquire(trackId);
    if (track.entityId) {
      const entity = this.entities.find(x => x.id === track.entityId);
      if (entity && entity.detectedAt === undefined) {
        entity.detectedAt = this.elapsedMs;
        entity.state = 'DETECTED';
        this.emit('ENTITY_DETECTED', { entityId: entity.id, trackId });
      }
      this.paintSelection();
    }
    this.camera.setTarget(new Vector3(track.x, track.y, track.z));
    this.emit('TRACK_ACQUIRED', { trackId, entityId: track.entityId, confidence: track.confidence });
    this.syncTracks();
    this.emitSnapshot();
  }

  /** Legacy compatibility: this method expects an entity ID. */
  selectEntity(entityId: string) {
    const t = this.tracks.find(track => track.entityId === entityId);
    if (t) this.selectTrack(t.id);
  }

  classifyTrack(trackId: string, classification: EntityClass, confidence: number) {
    const t = this.tracker.get(trackId);
    if (!t) return;
    const safeConfidence = Math.max(0.1, Math.min(1, confidence));
    this.tracker.setTraineeClassification(trackId, classification, safeConfidence);
    const e = t.entityId ? this.entities.find(x => x.id === t.entityId) : undefined;
    if (e) {
      e.traineeClassification = classification;
      e.traineeConfidence = safeConfidence;
      e.detectedAt ??= this.elapsedMs;
      // IMPORTANT: e.category remains ground truth. The trainee answer is stored separately.
    }
    this.emit('CLASSIFICATION_SUBMITTED', { trackId, entityId: t.entityId, classification, confidence: safeConfidence });
    this.syncTracks();
    this.emitSnapshot();
  }

  decideTrack(trackId: string, decision: DecisionAction) {
    const t = this.tracker.get(trackId);
    if (!t) return;
    this.tracker.setDecision(trackId, decision);
    const e = t.entityId ? this.entities.find(x => x.id === t.entityId) : undefined;
    if (e) e.traineeDecision = decision;
    this.emit('DECISION_SUBMITTED', { trackId, entityId: t.entityId, decision });
    this.syncTracks();
    if (this.entities.every(e => e.traineeDecision !== undefined)) this.stop();
    this.emitSnapshot();
  }

  focusTrack(id: string) {
    const t = this.tracker.get(id);
    if (t) this.camera.setTarget(new Vector3(t.x, t.y, t.z));
  }
  resetCamera() { this.camera.setTarget(new Vector3(0, 12, 0)); this.camera.alpha = -Math.PI / 2.3; this.camera.beta = Math.PI / 3.15; this.camera.radius = 132; }

  private spawnDueEntities() {
    if (this.phase !== 'RUNNING') return;
    for (const e of this.entities) {
      if (this.elapsedMs < e.spawnT || this.spawnedEntityIds.has(e.id)) continue;
      this.spawnedEntityIds.add(e.id);
      this.meshes.get(e.id)?.setEnabled(true);
      this.trails.get(`guide-${e.id}`)?.setEnabled(true);
      this.emit('ENTITY_SPAWNED', { entityId: e.id, syntheticCategoryHidden: true });
    }
  }

  private syncTracks() { this.tracks = this.tracker.getAll().map(t => ({ ...t, history: [...t.history], sources: [...t.sources] })); }

  private step(dt: number) {
    this.elapsedMs += dt;
    this.spawnDueEntities();

    // Optional authored stress event: a difficult scenario may introduce one clear,
    // replayable degradation event after the session is underway.
    if (!this.degradationTriggered && this.scenario.difficulty >= 0.68 &&
        this.elapsedMs >= this.scenario.scenarioDuration * 1000 * 0.34 && this.currentSensorHealth === 'NOMINAL') {
      this.currentSensorHealth = 'DEGRADED';
      this.degradationTriggered = true;
      this.emit('SENSOR_CHANGED', { health: this.currentSensorHealth, reason: 'SYNTHETIC_STRESS_EVENT' });
    }

    for (const e of this.entities) {
      if (!this.spawnedEntityIds.has(e.id)) continue;
      e.vx += e.ax * dt / 1000;
      e.vz += e.az * dt / 1000;
      e.x += e.vx * dt / 1000;
      e.y += e.vy * dt / 1000;
      if (Math.abs(e.x) > 104) e.vx *= -1;
      if (Math.abs(e.z) > 104) e.vz *= -1;
      const mesh = this.meshes.get(e.id);
      if (mesh) { mesh.position.set(e.x, e.y, e.z); mesh.rotation.y += 0.018; }
      const guide = this.trails.get(`guide-${e.id}`);
      if (guide) {
        MeshBuilder.CreateLines(`entity-guide-${e.id}`, {
          points: [new Vector3(e.x, 0.1, e.z), new Vector3(e.x, e.y, e.z)],
          instance: guide, updatable: true,
        }, this.scene);
      }
    }

    const liveScenario = { ...this.scenario, sensorHealth: this.currentSensorHealth };
    const activeEntities = this.entities.filter(e => this.spawnedEntityIds.has(e.id));
    this.observations = this.fusion.observe(activeEntities, liveScenario, this.elapsedMs);
    const prior = new Map(this.tracks.map(t => [t.id, t.state]));
    this.tracks = this.tracker.update(this.observations, dt, this.elapsedMs, this.scenario.trackingDifficulty);

    for (const t of this.tracks) {
      const old = prior.get(t.id);
      if (old !== t.state && t.state === 'LOST') this.emit('TRACK_LOST', { trackId: t.id });
      if (old === 'LOST' && t.state === 'REACQUIRED') this.emit('TRACK_REACQUIRED', { trackId: t.id });
      if (!old) this.emit('TRACK_CREATED', { trackId: t.id, entityId: t.entityId });
    }

    if (this.elapsedMs - this.lastObservationEventAt >= 1000) {
      this.lastObservationEventAt = this.elapsedMs;
      const bySource: Record<string, number> = {};
      for (const o of this.observations) bySource[o.source] = (bySource[o.source] ?? 0) + 1;
      this.emit('OBSERVATION_CREATED', { count: this.observations.length, sources: bySource });
    }

    if (this.elapsedMs - this.lastKeyframe >= 500) {
      this.lastKeyframe = this.elapsedMs;
      this.emit('REPLAY_KEYFRAME', {
        tracks: this.tracks.map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, confidence: t.confidence, state: t.state, entityId: t.entityId })),
        entities: activeEntities.map(e => ({ id: e.id, x: e.x, y: e.y, z: e.z })),
        time: this.elapsedMs,
      });
      const bySource: Record<string, { count: number; quality: number }> = {};
      for (const o of this.observations) {
        const item = bySource[o.source] ?? { count: 0, quality: 0 };
        item.count++; item.quality += o.confidence; bySource[o.source] = item;
      }
      this.emit('SENSOR_KEYFRAME', {
        sources: Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, {
          count: v.count, quality: v.count ? Number((v.quality / v.count).toFixed(3)) : 0,
        }])),
        health: this.currentSensorHealth,
      });
      this.updateTrails();
    }

    if (this.elapsedMs >= this.scenario.scenarioDuration * 1000) this.stop();
  }

  private updateTrails() {
    for (const t of this.tracks) {
      if (t.history.length < 2) continue;
      const points = t.history.slice(-28).map(p => new Vector3(p.x, p.y, p.z));
      const name = `track-trail-${t.id}`;
      const existing = this.trails.get(name);
      let line: any;
      if (existing) {
        line = MeshBuilder.CreateLines(name, { points, instance: existing as any, updatable: true }, this.scene) as Mesh;
      } else {
        line = MeshBuilder.CreateLines(name, { points, updatable: true }, this.scene) as Mesh;
      }
      line.color = t.id === this.selectedTrackId ? new Color3(0.95, 0.95, 1) : new Color3(0.32, 0.34, 0.38);
      this.trails.set(name, line);
    }
  }

  private paintSelection() {
    const selected = this.tracker.get(this.selectedTrackId ?? '');
    const selectedEntityId = selected?.entityId;
    for (const [id, mesh] of this.meshes) {
      const material = mesh.material as StandardMaterial | null;
      if (!material) continue;
      material.emissiveColor = id === selectedEntityId ? new Color3(0.78, 0.80, 0.88) : new Color3(0.24, 0.25, 0.29);
    }
  }

  private tick = (now: number) => {
    if (this.disposed) return;
    const frame = Math.min(100, Math.max(0, now - this.last));
    this.last = now;
    if (this.phase === 'RUNNING') {
      this.accumulator += frame * this.speed;
      while (this.accumulator >= this.fixedStep && this.phase === 'RUNNING') {
        this.step(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }
    }
    this.scene.render();
    if (now - this.lastSnapshotAt >= 100) {
      this.lastSnapshotAt = now;
      this.emitSnapshot();
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private emitSnapshot() {
    const sensorHealth = this.currentSensorHealth === 'NOMINAL' ? 1 : this.currentSensorHealth === 'DEGRADED' ? 0.68 : 0.38;
    const snapshot: EngineSnapshot = {
      elapsedMs: Math.round(this.elapsedMs),
      entities: this.getEntities(),
      tracks: this.getTracks(),
      observations: this.getObservations(),
      fps: Math.round(this.be.getFps()),
      phase: this.phase,
      sensorHealth,
      rendererBackend: this.backend,
    };
    this.listeners.forEach(listener => listener(snapshot));
  }

  async enterXR(): Promise<void> {
    // Load Babylon's XR extension only on demand so desktop startup stays light.
    await import('@babylonjs/core/XR/webXRDefaultExperience');
    const xrScene = this.scene as Scene & { createDefaultXRExperienceAsync?: (options?: unknown) => Promise<{ baseExperience?: { enterXRAsync: (mode: 'immersive-vr', referenceSpace: 'local-floor') => Promise<unknown>; exitXRAsync?: () => Promise<unknown> } }> };
    if (!xrScene.createDefaultXRExperienceAsync) throw new Error('Babylon WebXR integration is unavailable in this build.');
    if (!this.xrExperience) {
      this.xrExperience = await xrScene.createDefaultXRExperienceAsync({
        floorMeshes: [this.ground],
        uiOptions: { sessionMode: 'immersive-vr', referenceSpaceType: 'local-floor' },
      });
    }
    const baseExperience = this.xrExperience?.baseExperience;
    if (!baseExperience?.enterXRAsync) throw new Error('This browser does not expose an immersive VR session.');
    await baseExperience.enterXRAsync('immersive-vr', 'local-floor');
  }

  async exitXR(): Promise<void> {
    const baseExperience = this.xrExperience?.baseExperience;
    if (baseExperience?.exitXRAsync) await baseExperience.exitXRAsync();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.scene.dispose();
    this.be.dispose();
    this.listeners.clear();
    this.eventListeners.clear();
    this.meshes.clear();
    this.trails.clear();
  }
}
