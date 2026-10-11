# V5 UI interaction matrix

| Screen | Control | Expected effect | Implementation / verification |
|---|---|---|---|
| Navigation | Each navigation item | Changes the active page and URL hash | `setView`; source/import validation |
| Navigation | Active profile selector | Changes session attribution and persists the active profile ID | `setActiveProfile` + localStorage |
| Command | Start SIH Demo | Selects a fixed showcase scenario and opens live training | `setScenario` + `setView` |
| Command | Adaptive Session | Generates the next seeded scenario from stored score history | `recommendScenario` |
| Command | Recent session card | Opens that session's AAR | Persisted `SessionRecord` |
| Training | Start/Pause/Resume | Changes the deterministic engine phase | `SimulationEngine` |
| Training | Radar dot / track row | Selects a track, marks acquisition, and focuses the camera | `selectTrack` + Babylon camera |
| Training | Reset camera / Focus selected | Repositions/follows the selected track | Babylon camera |
| Training | Classification chips / confidence / Log Classification | Stores trainee answer separately from ground truth | `classifyTrack` |
| Training | Local Evidence Assist | Runs a local synthetic classifier on observed track features | `predictSyntheticTrack` |
| Training | Enter/Exit Immersive VR | Requests/ends immersive WebXR where supported; reports errors without breaking desktop mode | Lazy Babylon XR experience |
| Training | Decision chips / Submit Decision | Stores an abstract training response and may complete the scenario | `decideTrack` |
| Training | Finish + AAR | Stops the session, scores, persists, and opens AAR | `scoreSession` + IndexedDB |
| Tracking | Track rows | Changes selected track and updates track details | `TrackManager` snapshot / selection store |
| Fusion | Sensor details | Shows actual saved synthetic channel summaries | Engine observations / fusion keyframes |
| Scenario Lab | Generate New | Generates a new seed/configuration | `generateScenario` |
| Scenario Lab | Save / Save & Run | Validates and persists, optionally starting training | `validateScenario` + Dexie/store |
| Scenario Lab | Duplicate / Delete | Creates a new scenario or confirms local deletion | Store/repository |
| Scenario Lab | Import/Export JSON | Schema-validates import or downloads a JSON file | `validateScenario` / Blob |
| Media | Asset selection | Changes the evidence source and metadata | React state + video element |
| Media | Play/Pause/Seek / Use in new scenario | Controls bundled local clip or builds a scenario using that profile | HTML video API + scenario builder |
| AAR | Play/Pause/step/seek/speed | Reconstructs the saved event/keyframe timeline | Local replay state |
| AAR | Export JSON / Adaptive Next / Re-run | Downloads the record or creates a seeded follow-on scenario | Blob + adaptive/scenario logic |
| History | Search and sort | Filters/reorders actual sessions | Derived list from store |
| History | Open AAR / Export / Delete | Opens record, downloads JSON, or deletes after confirmation | Store/repository |
| Analytics | Filters and chart views | Filters saved records and recalculates metrics | Derived session aggregation |
| Unit Analytics | Add/Rename/Use/Archive | CRUD for local profiles; archive protects the last profile | Zustand + Dexie |
| System | Quality/speed/reduced motion | Persists preferences and applies rendering/CSS settings | Store + engine |
| System | Export/import | Exports complete local backup / validates before merge | Repository/store |
| System | Reset sessions | Confirms and clears sessions only | Repository |
| System | Test Local API | Checks the loopback API service and version | `GET /api/health` |
| System | Sync Browser → API | Validates/merges a browser backup into the local archive | `POST /api/import` |
| System | Merge API → Browser | Imports/merges validated local API records into IndexedDB | `GET /api/state` + store `importAll` |
| Phone companion | All 12 workspace tabs | Switches to the corresponding responsive screen | `mobile-demo/index.html` — Chromium workflow exercised |
| Phone companion | Generate/Save/Import/Export scenario | Updates local demo Scenario DNA and validates imported bounds | Single-file JS handlers |
| Phone companion | Sensor degrade | Lowers visibility/health and increases ambiguity, re-generates contacts | `degrade` handler |
| Phone companion | Start/Assess/Finish/AAR/Replay | Records assessments, calculates score, saves session in current demo state, and steps replay | Standalone phone demo workflow exercised |
| Phone companion | Full backup export | Downloads JSON including profile, scenario, sessions and scenario library | Blob download |

No visible control is intentionally decorative. The V5 Playwright suite contains browser flows for the main application and phone companion; run it after installing Chromium to verify against the local React build.
