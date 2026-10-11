# V5 AI / perception layer

The shipped local classifier is a deterministic multinomial logistic-regression model trained at runtime on synthetic feature examples by `src/simulation/localMl.ts`. Inputs at inference are observed track signature (from noisy synthetic observations), motion, height and derived acceleration. The provider returns a label, confidence distribution, provider label and measured inference latency.

This is a real lightweight local inference algorithm, but it is **not** an ONNX model and is not trained or validated on real drone footage. The output is only a synthetic training suggestion; the deterministic simulation engine and scoring engine remain authoritative.

The instructor/coaching layer is deterministic and uses structured saved score/session information. It does not need an API key or network access and cannot modify ground truth, event history or score values.
