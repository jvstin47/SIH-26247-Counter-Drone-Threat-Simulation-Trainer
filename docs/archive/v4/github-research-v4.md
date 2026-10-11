# GitHub and technology research — AID-C2S V4

**Research checked:** 10 October 2026. This document distinguishes public repository facts from our engineering decisions. The project references these repositories for architecture and compatibility; it does not vendor their source code.

## Repositories reviewed

| Repository / source | Useful ideas | Why it is not copied as the application foundation |
|---|---|---|
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | Maintained web 3D engine, scene graph, camera/render loop, WebGPU and WebGL paths, mesh/line geometry, engine diagnostics. The release stream was checked for the current 9.30.0 line. | This is the render foundation, but simulation truth remains in our TypeScript domain engine; rendering does not own scores or ground truth. |
| [Microsoft AirSim](https://github.com/microsoft/AirSim) and its [Windows build guide](https://github.com/microsoft/AirSim/blob/main/docs/build_windows.md) | Useful reference for simulator architecture, synthetic sensor/vehicle data, repeatable experiment workflows, and the distinction between simulation and external control. | AirSim's documented build flow relies on Unreal Engine and Visual Studio C++ tooling, which adds substantial installation and hardware complexity for a lightweight, offline SIH browser demonstration. We borrow no vehicle-control code. |
| [gym-pybullet-drones](https://github.com/learnsyslab/gym-pybullet-drones) | A configurable Python/PyBullet research simulator and examples for repeatable multi-agent experiments. Useful reference for state separation and reproducible tests. | Its Python/PyBullet scientific stack is not a browser frontend dependency. AID-C2S uses a small deterministic synthetic training world rather than real vehicle dynamics. |
| [WebXR Samples](https://github.com/immersive-web/webxr-samples) | Feature-detection and progressive-enhancement patterns for immersive experiences. | XR is optional in AID-C2S V4. The desktop UI must work without a headset. |
| [ONNX Runtime inference examples](https://github.com/microsoft/onnxruntime-inference-examples) | Reference for the separation between model loading, input preparation, inference providers, and output handling. | V4 does **not** claim to ship a verified ONNX model artifact. The active offline classifier is a small softmax/logistic model trained on generated synthetic features at runtime; it has no external model download or cloud dependency. |
| [Vite](https://github.com/vitejs/vite), [Vitest](https://github.com/vitest-dev/vitest), [Playwright](https://github.com/microsoft/playwright) | Local development, unit testing, end-to-end interaction tests, traces/screenshots, and release automation. | Used as standard project tooling; no source code is copied from these projects. |

## Design decisions

1. **Browser-first:** The user's target PC and demonstration environment can run the training UI without Unreal Engine, a dedicated simulation server, or a headset.
2. **Babylon.js for visualization:** 3D entities, scene objects and track trails are rendered by Babylon.js. Simulation and scoring remain independent of React/Babylon rendering.
3. **Deterministic synthetic engine:** Ground truth is seeded and replayable. No real platform performance or operational parameters are encoded.
4. **Lightweight tracker:** Deterministic nearest-neighbour association with confidence-weighted alpha updates is sufficient for a training demo. It is not presented as operational-grade sensor fusion.
5. **Local synthetic classifier:** V4 trains a small, transparent softmax classifier from generated feature vectors. Inference is local and suggestions cannot alter the score or ground truth.
6. **Offline media:** Three short H.264 MP4 loops are generated specifically for this project; they show synthetic sensor/anomaly overlays and do not depend on third-party video hosting.
7. **Progressive enhancement:** WebGPU is attempted, WebGL is the fallback, XR is capability-gated, and core data is stored locally in IndexedDB.
8. **Dependency minimization:** Unused `onnxruntime-web`, `@babylonjs/gui`, and `dexie-react-hooks` dependencies were removed from V4 rather than increasing install size to make unsupported claims.

## Verified current package lines

Exact package versions are pinned in `package.json` to reduce differences between machines. As checked for this V4 package, these include Babylon.js 9.30.0, React 19.3.0, Vite 8.3.4, TypeScript 7.0.2, Vitest 5.0.3, Playwright 1.64.0, and Tauri 2.12.0. If a clean install fails on the user's Node version, use the exact error from npm before changing versions—do not run a blind `npm update`.

## Limits of the research

- Public GitHub documentation does not establish comparative military-training effectiveness or make claims about classified/proprietary systems.
- AID-C2S V4 is a synthetic educational prototype. The browser build does not model real sensors, real weapon systems, or operational countermeasure procedures.
- Repository availability and releases can change; this record captures the sources consulted on the date above.
