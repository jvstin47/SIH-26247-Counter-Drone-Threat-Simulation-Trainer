# AID-C2S V5 release notes

## V5.0.0 — 10 October 2026

### Improvements
- Updated product metadata and V5 visual branding.
- Added offline core validation harness independent of Babylon/React runtime imports.
- Added stronger local import/export module consistency checking.
- Tightened track identity association: entity IDs are hard constraints; ghost returns do not merge into entity-backed tracks.
- Kept resolved/classified track kinematics moving while preserving lifecycle/trainee answer state, preventing duplicates caused by a stale association position.
- Made the Babylon vertical datum guides updatable before updating line mesh instances.
- Fixed TrainingView's classifier `ReturnType` reference.
- Fixed a malformed sensor-fusion test and stale tracking test API method.
- Expanded regression tests for identity association and resolved-track continuity.
- Added a validated loopback local API with scenario/session/profile/settings endpoints, backup import/export merge, CORS origin checks, payload limits, atomic writes and `.bak` retention.
- Connected System → Local API controls for health, browser-to-API sync and API-to-browser restore.
- Added Playwright E2E checks for the local API integration and standalone phone companion.
- Fixed the standalone demo's sensor-degradation button and tightened scenario-import bounds.
- Added a Windows launcher that starts Vite and the optional API; stop/restart aliases target only this project.

### Verification summary
- Source/transpile and local import/export consistency: PASS, 42 files.
- Offline simulation/scoring/adaptive/classifier harness: PASS, 20 tests.
- Local API integration: PASS, 8 checks.
- Standalone phone demo in mobile-sized Chromium: PASS for 11 navigation tabs, scenario authoring, training assessment, AAR/replay/history and zero page errors.
- Full npm dependency install / Vite production build / full React Playwright suite: not completed in the authoring environment because npm registry access timed out. See `docs/v5-validation-report.md`.
