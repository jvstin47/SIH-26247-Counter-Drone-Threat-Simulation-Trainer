# AID-C2S V5 build status

## Verified in the available authoring environment

- TypeScript/TSX syntax + local import/export consistency: PASS (42 source/test files).
- Deterministic simulation/scenario/tracking/fusion/scoring/adaptive/local classifier harness: PASS (20 tests).
- Optional local API integration tests: PASS (8 tests).
- Standalone mobile companion Chromium workflow: PASS (navigation, scenario save, synthetic sensor degradation, local profile creation, assessments, AAR/replay, history, and no JS page errors).
- Local media: PASS (three 8-second H.264 MP4 assets at 960x540).
- Release archive: source and launcher included; no `node_modules` or generated `dist` directory bundled.

## Pending target-machine verification

An npm dependency install timed out while resolving the npm registry from the authoring environment. As a result, a full `tsc -b`, Oxlint, Vitest suite, Playwright main-app e2e suite, and Vite production build are not marked as passed. Run `VERIFY-AID-C2S-V5.bat` on Windows after `npm.cmd install` and save `validation/latest-verification.log`.

WebGPU/WebXR and optional Tauri packaging are hardware/toolchain dependent and must be verified on the target machine.
