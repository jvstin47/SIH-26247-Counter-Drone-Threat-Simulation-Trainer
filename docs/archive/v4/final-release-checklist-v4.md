# AID-C2S V4 final release checklist

Legend: **SOURCE READY** means the implementation is present and syntax/static logic was inspected in this environment. **MACHINE VERIFY** means a dependency-backed build/browser/device test must be executed on the target Windows system; it must not be advertised as passed before doing so.

| Requirement | Status | Evidence / next action |
|---|---|---|
| Current repository reviewed and architecture reworked | SOURCE READY | `docs/github-research-v4.md`, `docs/architecture-v4.md` |
| Black/white glass design | SOURCE READY | `src/styles/v4.css` overrides the old teal theme |
| Seeded scenario generation (20 showcase scenario profiles) | SOURCE READY | `src/simulation/scenarios.ts`, unit tests |
| Entity spawn lifecycle | SOURCE READY | `src/simulation/Engine.ts` |
| False-return track flood fixed | SOURCE READY | false return opportunity rate-limited in `sensorFusion.ts` |
| Track state/history/focus | SOURCE READY | `src/simulation/tracking.ts`, `Engine.ts` |
| Ground truth separate from trainee answer | SOURCE READY | entity `category` unchanged; trainee fields are separate; `scoring.ts` tests |
| Local trained synthetic classifier | SOURCE READY | `src/simulation/localMl.ts`; no external model download |
| Sensor channels and confidence | SOURCE READY | `src/simulation/sensorFusion.ts`, Fusion and Training views |
| 3 local animated H.264 clips | SOURCE READY | `public/media/*.mp4`; ffprobe verifies valid MP4 containers/duration |
| Scenario import/export/save/delete | SOURCE READY | validation and Scenario Lab handlers |
| Session persistence/history/delete/export | SOURCE READY | repository/store/History view |
| AAR/export/replay controls | SOURCE READY | AAR view and stored keyframes/events |
| Analytics from saved sessions | SOURCE READY | Analytics/UnitAnalytics components |
| Profile persistence | SOURCE READY | local active-profile id plus IndexedDB profiles |
| Full backup import validation | SOURCE READY | store validates typed records before merge |
| WebGPU with WebGL fallback | SOURCE READY | `SimulationEngine.create()` tries WebGPU and catches initialization errors |
| WebXR capability detection | SOURCE READY | capability check is optional; not a requirement for desktop mode |
| Production-only service worker | SOURCE READY | `App.tsx`, `public/sw.js` |
| Stable-port Windows launcher | SOURCE READY | persistent port file in `%APPDATA%\AID-C2S-V4\port.txt` |
| Unit tests authored | SOURCE READY | `tests/*.test.ts` |
| Playwright smoke tests authored | SOURCE READY | `tests/e2e/smoke.spec.ts`, `playwright.config.ts` |
| TypeScript/TSX parser scan | PASS | All project TS/TSX sources parsed without syntax diagnostics after V4 edits |
| Pure simulation/track/scoring/ML smoke test | PASS | Deterministic generation, bounded track count, normalized model output, immutable ground truth; rerun after final edits |
| `npm install` | MACHINE VERIFY | Requires npm registry access on the target machine |
| `npm run typecheck` | MACHINE VERIFY | Run after install; fix any type errors before SIH submission |
| `npm run lint` | MACHINE VERIFY | Run after install; fix reported errors |
| `npm test` | MACHINE VERIFY | Run all Vitest tests after install |
| Playwright e2e in Chrome | MACHINE VERIFY | Requires installed Chrome or Playwright Chromium |
| `npm run build` | MACHINE VERIFY | Production bundle must build on target system |
| Offline production PWA test | MACHINE VERIFY | Build, open, load once, enable offline, reload and verify app + media |
| WebGPU renderer path | MACHINE VERIFY | Check `System` and Training header on target Chrome/GPU |
| WebGL fallback | MACHINE VERIFY | Test with WebGPU disabled/unavailable |
| WebXR immersive mode | SOURCE READY / MACHINE VERIFY | Enter/Exit control is capability-gated and errors fall back to desktop; needs a compatible headset/browser to verify |
| Tauri desktop package | MACHINE VERIFY / OPTIONAL | Requires Rust/MSVC/WebView2 prerequisites |
