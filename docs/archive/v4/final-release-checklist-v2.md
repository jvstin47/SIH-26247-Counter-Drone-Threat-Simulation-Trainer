# AID-C2S V2 release checklist

- [x] React/Babylon application scaffold
- [x] Monochrome glass UI rewrite
- [x] Training workflow
- [x] Deterministic seeded scenarios
- [x] Synthetic sensor observations
- [x] Track lifecycle / association
- [x] Deterministic scoring
- [x] AAR/replay
- [x] Session history
- [x] Individual analytics
- [x] Unit/profile analytics
- [x] Scenario Lab
- [x] Media Evidence with local synthetic MP4s
- [x] IndexedDB persistence
- [x] PWA service worker
- [x] WebGPU/WebXR capability detection
- [x] Local AI heuristic provider with explicit fallback labeling
- [x] Optional local API backend
- [x] Vitest tests for scenario/scoring/adaptive/tracking cores
- [x] Windows launch/build helper scripts

Runtime verification still required on the target Windows machine:
- `npm.cmd install`
- `npm.cmd run build`
- `npm.cmd run dev`
- manual browser walkthrough
- full browser E2E with Playwright
- optional Tauri native build after Rust/MSVC prerequisites are installed
