# Technology Snapshot

Verified during this build workflow:

- React 19.3.x target
- Vite 8.3.x target
- TypeScript 7.0.x target
- Babylon.js 9.29.x target
- ONNX Runtime Web 1.30.x target
- Tauri 2.12.x optional target

The implementation intentionally avoids depending on exact patch versions in source. Fresh installation on the target Windows machine should resolve versions from package.json and produce a fresh lockfile.
