# AID-C2S V5 known limitations

- The local classifier is a deterministic multinomial logistic regression trained at runtime on invented synthetic feature ranges. It is not a validated detector trained on real imagery and no ONNX model artifact is shipped.
- The instructor is deterministic score-based coaching, not a connected cloud LLM.
- Tracking uses a deterministic nearest-neighbour gate and confidence-weighted alpha update. It is a training demonstration, not an operational-grade multi-target estimator.
- All sensors, sensor values and media are synthetic. No real sensor hardware or external imagery is read by default.
- The optional API listens on loopback (`127.0.0.1`) and is for local archive/sync. It is not a remote multi-device service or production authentication system.
- The phone demo is a standalone responsive Canvas companion. It is not the full React/Babylon/WebGPU application and browser persistence for `file://` URLs varies by Android viewer.
- WebGPU/WebXR paths depend on browser and hardware support. VR hardware was not available for validation in this environment.
- The native Tauri installer requires Windows Rust/MSVC build tools and has not been verified here.
- Full React type checking, Vite production build and Playwright end-to-end tests must be run after `npm install` succeeds on the target Windows machine.
