# V5 Simulation Design

The simulation uses a fixed 50 ms step (20 Hz simulation updates) with render frames independent from simulation truth. Each scenario is generated from a versioned Scenario DNA seed. Entity state, synthetic observations and track association are deterministic for the same seed/configuration/input sequence.

Pipeline:

`Scenario DNA → seeded entities → noisy synthetic sensor observations → identity-gated track fusion → trainee actions → event log/keyframes → deterministic scoring → AAR/replay`

Babylon.js is the visual layer only. WebGPU is used when capability checks succeed; WebGL is the fallback. Optional WebXR does not gate the desktop training path.

All entities, trajectories and sensor parameters are synthetic. No physical sensor input or operational engagement data is used.
