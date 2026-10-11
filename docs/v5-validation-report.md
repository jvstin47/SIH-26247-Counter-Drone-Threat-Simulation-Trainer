# AID-C2S V5 validation report

Date: 10 October 2026

## Executed checks

| Check | Result | Scope |
|---|---|---|
| TypeScript/TSX syntax + internal import/export consistency | PASS — 42 source/test files | TypeScript compiler transpilation and local module/export consistency. This is not the full semantic typecheck. |
| Deterministic simulation/scoring/adaptive/local classifier core | PASS — 20 tests | Seeded RNG and scenarios, 30-variant showcase catalogue, schema bounds, repeatable sensor fusion, false-return rate limiting, signature propagation, entity/ghost identity isolation, multi-sensor association, one history point per tick, lost/reacquired lifecycle, classified/resolved continuity, scoring/ground-truth immutability, false-positive penalty, adaptive bounds, and local logistic inference. |
| Local API integration | PASS — 8 tests | Health, scenario CRUD, session/profile persistence, backup merge by ID, rejection of malformed scenarios, unknown routes/CORS, settings validation, atomic writes and previous-state backup. |
| Standalone phone demo browser workflow | PASS | Mobile-sized Chromium session loaded the single-file HTML; navigated all 12 workspaces (11 secondary navigation tabs plus command), generated/saved a scenario, applied sensor degradation, created a profile, completed three assessments, generated AAR, stepped replay, checked history/export, and reported zero JavaScript page errors. The test uses in-memory fallback because this authoring browser was given an opaque/inline document origin. |
| Bundled media | PASS | Three locally bundled H.264 MP4 synthetic evidence loops included; no external video fetch required. |
| V5 archive / source / launchers | PASS | Clean source release includes `START-AID-C2S-V5.bat`, test scripts, docs, local media, API and standalone phone demo; excludes `node_modules` and generated `dist`. |
| Full npm installation / semantic `tsc -b` / lint / Vitest / React-app Playwright E2E / Vite production build | NOT VERIFIED | `npm install --no-audit --no-fund` timed out while resolving from the npm registry in this authoring environment. These are not marked as passed. |
| WebGPU/WebXR hardware path | NOT VERIFIED HERE | Requires testing in the target browser/GPU and a compatible XR headset. |
| Tauri Windows installer | NOT VERIFIED HERE | Requires target Windows Rust/MSVC prerequisites; Tauri remains an optional packaging layer. |

## Commands for the target Windows machine

```powershell
npm.cmd install
npm.cmd run validate:source
npm.cmd run test:offline
npm.cmd run test:backend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

Alternatively double-click `VERIFY-AID-C2S-V5.bat` after the first dependency install and Playwright Chromium install. The verification log is written to `validation/latest-verification.log`.

## Defects fixed during the V5 pass

- Corrected an unresolved `ReturnType` symbol in TrainingView.
- Corrected a malformed sensor-fusion test and an outdated TrackManager test method.
- Added a persistent ground-mesh member required by optional WebXR setup.
- Made entity identity a hard association constraint so false returns and different entities cannot merge by proximity alone.
- Converted the tracker to one history/velocity correction per track per tick; source observations in the same step refine a fused track rather than inflating history or repeatedly updating velocity.
- Carried noisy observed synthetic signatures into tracks so local ML inference uses an observed feature, not only track confidence.
- Kept `REACQUIRED` visible for a complete tick even when multiple sensors report the track, then returned it to normal tracking on the next tick.
- Kept resolved/classified track kinematics current to prevent duplicate tracks caused by a frozen predicted position.
- Made Babylon guide lines explicitly updatable before instance updates.
- Hardened imported session score bounds, event types/timestamps and session timestamps.
- Made the dashboard's latest session follow active-profile switching.
- Added the optional schema-validated loopback API and System-screen sync/restore controls.
- Added in-memory storage fallback for the standalone phone demo if a local file viewer blocks `localStorage`.

## Release verdict

V5 has tested core/domain logic, API workflows, source consistency and the standalone phone companion. **The full React/Babylon production build is still a release candidate pending a successful clean install and full build/test cycle on Windows.** Preserve the first generated `package-lock.json` from that successful install to stabilize transitive dependency versions.
