# AID-C2S Architecture

AID-C2S is a browser-first, local-first training platform. React owns the product shell; Babylon.js owns visualization; the deterministic simulation package owns state transitions; IndexedDB owns local records. AI providers are optional and never define ground truth or scores.

```text
React UI
  ├─ Dashboard / Training / Scenario Lab / AAR / Analytics
  └─ Zustand session state
       │
       ├─ SimulationEngine (fixed timestep + seeded RNG)
       ├─ ScoringEngine (deterministic)
       ├─ Replay/Event Log
       ├─ AdaptiveDifficulty
       └─ PerceptionProvider (mock / future ONNX)
              │
           Babylon.js
              │
          WebGPU → WebGL
```
