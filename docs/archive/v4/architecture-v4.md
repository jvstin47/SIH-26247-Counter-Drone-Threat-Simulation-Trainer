# AID-C2S V4 architecture

## Runtime ownership

- **React:** pages, navigation, interaction state, forms, accessibility.
- **Zustand:** selected view, selected track, active profile, current scenario and store-facing state.
- **Dexie / IndexedDB:** local profiles, scenarios, session records, event streams and settings.
- **Babylon.js:** synthetic world, camera, terrain/structure geometry, entities, grid, datum rings and track trails.
- **SimulationEngine:** fixed-step simulation loop, deterministic entities, spawn lifecycle, sensor observation calls, event emission and session time.
- **SensorFusion:** synthetic observation channels, configurable uncertainty and rate-limited background false returns.
- **TrackManager:** deterministic nearest-neighbour association, track history and lifecycle state.
- **Scoring:** pure deterministic scoring based on immutable entity ground truth and separate trainee answers.
- **Local classifier:** softmax logistic regression trained from procedural feature samples; inference uses track-observed features, never ground-truth category.
- **Service worker:** production-only app/media shell cache. It is deliberately not registered in development to avoid stale Vite modules.

## Critical truth boundary

`SimEntity.category` is ground truth. `Track.traineeClassification`, `Track.traineeConfidence`, `Track.decision`, and their entity-level trainee answer mirrors are separate. Classification actions never write `SimEntity.category`. `scoreSession()` receives entities and tracks and reads ground truth from the immutable entity category.

## Replay boundary

The event log records state transitions, track creation/acquisition/loss/reacquisition, classification, decisions, sensor-health changes, periodic sensor summaries, and 500 ms keyframes. Replay displays the latest stored keyframe at or before the selected event timestamp. This supports review of the recorded session; it does not promise bit-for-bit determinism across different GPU/browser renderers.

## Persistence

The V4 package keeps the existing `aid-c2s-v2` IndexedDB name so a local V2 store can be read where the origin is unchanged. The browser isolates storage by origin, including port; the V4 launcher therefore persists a chosen localhost port and reuses it between runs. Backups use JSON and are validated before being merged.

## Rendering and capability policy

The engine attempts WebGPU where a real adapter is available; on initialization failure it creates a Babylon WebGL engine. If no adapter exists, WebGL starts immediately. WebXR remains optional. The app reports adapter capability separately from the renderer that was actually created.

## Performance controls

- fixed simulation step: 50 ms (20 Hz)
- UI snapshot emission: approximately 10 Hz instead of triggering React state for every render frame
- false sensor return rate-limited to one synthetic opportunity per 1.8-second bucket
- track history capped at 90 samples; trails use the most recent 28 samples
- local classifier trained lazily on first request
- media is short local H.264 and lazy-loaded in the relevant view
