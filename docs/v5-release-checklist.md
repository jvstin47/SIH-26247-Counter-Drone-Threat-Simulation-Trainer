# AID-C2S V5 release checklist

| Requirement | Evidence/status |
|---|---|
| Source syntax + relative imports checked | PASS — 42 files |
| Core deterministic simulation/fusion/tracking/scoring/adaptive/local classifier | PASS — 20 offline tests |
| Tracking identity/ghost separation | PASS — tested |
| Resolved track continuity | PASS — tested |
| Optional local API validation/CRUD/merge/persistence | PASS — 8 API tests |
| Phone companion all navigation / training / AAR / replay / history browser flow | PASS — headless Chromium test |
| Windows stable-port launcher and API companion | SOURCE READY — target Windows run required |
| npm clean install | NOT VERIFIED — npm registry DNS blocked during authoring |
| Full TypeScript `tsc -b` typecheck | PENDING target Windows install |
| Oxlint | PENDING target Windows install |
| Vitest suite | PENDING target Windows install (core subset independently passed) |
| Playwright app e2e | PENDING target Windows install/browser setup; phone companion path tested independently here |
| Vite production build | PENDING target Windows install |
| WebGPU hardware path | PENDING target browser/GPU |
| WebXR immersive mode | PENDING compatible headset/browser |
| Tauri Windows EXE/MSI | PENDING Windows Rust/MSVC prerequisites |

Release policy: do not change PENDING items to PASS without actual command/browser evidence.
