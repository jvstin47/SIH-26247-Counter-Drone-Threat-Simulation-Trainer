# Known limitations — V4

- This is a synthetic SIH prototype; it is not certified training software and does not connect to real sensors, drones, weapons or field devices.
- Track fusion is a deterministic nearest-neighbour/alpha-style demonstration, not an operational multi-target tracker.
- The local classifier is trained on procedurally generated feature examples, not collected or validated real drone data.
- The included videos are generated sensor/evidence loops, not authentic aerial footage.
- The LLM instructor is not connected in V4; deterministic coaching is used.
- No ONNX model file is shipped; the active classifier is local JavaScript inference.
- XR capability is feature-detected but requires compatible hardware/browser to test immersive sessions.
- Tauri packaging is optional and needs a separate Windows toolchain build.
- npm installation/build/e2e checks must be confirmed on the target Windows system before claiming production verification.
