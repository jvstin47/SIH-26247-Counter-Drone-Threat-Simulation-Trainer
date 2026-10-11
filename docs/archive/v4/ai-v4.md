# AI boundary — V4

The active local classifier is a small multinomial softmax/logistic model trained on generated synthetic feature vectors at first use. It is deterministic, has no network dependency, returns a distribution across five fictional training classes, and reports inference latency.

The training UI calls `predictSyntheticTrack(track)`: features are derived from track confidence, estimated speed/altitude and recent observed movement. The inference function does not receive `entityId` or read `SimEntity.category`. It only provides a suggestion to the trainee; it never selects a class/decision automatically and cannot affect `scoreSession`.

V4 does **not** ship a validated ONNX model or cloud LLM. ONNX Runtime examples were reviewed as a future provider pattern, but unused ONNX runtime dependencies were removed to keep the offline build lean and avoid falsely representing a placeholder as real inference.
