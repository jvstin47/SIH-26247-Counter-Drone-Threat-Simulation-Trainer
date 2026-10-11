# GitHub research and technology decisions — AID-C2S V5

Research checked: **10 October 2026**. The repositories below informed architectural choices; their source was not copied wholesale into AID-C2S.

| Public repository/source | Verified public information | How it informs V5 |
|---|---|---|
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) and [9.30.0 release](https://github.com/BabylonJS/Babylon.js/releases) | The GitHub release page lists Babylon.js 9.30.0 as latest, released 8 October 2026. The project is Apache-2.0. | Browser-first 3D rendering with WebGPU capability detection and a WebGL fallback; no second 3D engine was added. |
| [React](https://github.com/facebook/react/releases) | The release page lists React 19.3.0 (9 September 2026). | Component-based application shell and screen composition. |
| [Vite](https://github.com/vitejs/vite/releases) | The release page lists Vite 8.3.4 as latest (8 October 2026). | Fast local development and production bundling. |
| [TypeScript](https://github.com/microsoft/TypeScript/releases) | The project pins TypeScript 7.0.2 in `package.json`; validate compatibility on a clean Windows install. | Strict typed domain interfaces and compilation checks. |
| [Vitest](https://github.com/vitest-dev/vitest/releases) | The release page lists Vitest 5.0.3 (30 September 2026). | Unit tests for deterministic simulation, scoring, tracking and adaptive difficulty. |
| [Playwright](https://github.com/microsoft/playwright/releases) | The release page lists Playwright 1.64.0 (7 October 2026). | Browser e2e tests for the React app and the standalone phone companion. |
| [AirSim](https://github.com/microsoft/AirSim) and [Project AirSim note](https://github.com/microsoft/AirSim/blob/main/project_airsim.md) | AirSim is a published autonomous-vehicle simulation project implemented as Unreal Engine/Unity plugins and supports research APIs. Its project note describes Project AirSim as the evolution of the original effort. | Useful reference for synthetic simulation concepts, but not adopted as the main stack because V5 targets a lightweight browser-first SIH setup rather than a heavyweight game-engine installation. |
| [gym-pybullet-drones](https://github.com/learnsyslab/gym-pybullet-drones) | The repository provides PyBullet/Gymnasium environments for single- and multi-agent quadcopter control and tests. | Reference for deterministic multi-entity simulation/testing patterns; not added as a runtime dependency because the V5 training logic is a browser TypeScript app. |
| [WebXR Samples](https://github.com/immersive-web/webxr-samples) | The repository demonstrates WebXR Device API sessions, input and rendering patterns and is MIT-licensed. | WebXR remains optional/progressive enhancement. Desktop operation does not require a headset. |
| [ONNX Runtime inference examples](https://github.com/microsoft/onnxruntime-inference-examples) | Public examples demonstrate model loading, input preparation and inference-provider patterns. | The current shipped classifier is the transparent synthetic logistic model; V5 does not claim a trained ONNX artifact is shipped. |

## Decisions

1. Keep Babylon.js as the only 3D engine.
2. Keep deterministic simulation and scoring independent from React and AI feedback.
3. Keep IndexedDB as the default persistence layer; the optional local API supports validated sync/backup, but offline training does not require it.
4. Keep a standalone Canvas phone demo because a full React/Babylon dev server is not practical from a downloaded HTML file on a phone.
5. Avoid real-world sensor specifications, classified data, operational targeting or weapon-employment instructions. All training entities and sensor parameters are synthetic.

## Scope caveat

Public projects reviewed do not prove that V5 is novel compared with every existing defence training system. V5 differentiators should be presented as a combination suited to this problem—seeded deterministic scenarios, replayable assessments, synthetic sensor uncertainty and hardware-light local delivery—not as an unsupported claim that no other simulator has these features.
