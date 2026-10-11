# Scoring model — V4

The pure `scoreSession(entities, tracks, durationMs)` function is deterministic. Every metric uses the full ground-truth entity count as its denominator, so skipping hard contacts does not inflate classification or decision accuracy. If several tracks exist for one truth entity, scoring selects a representative track; unassociated classified tracks may incur a false-positive penalty.

- Detection: 70% coverage + 30% latency component.
- Classification: correct trainee classifications / total ground-truth entities.
- Decision: correct abstract training policy decisions / total ground-truth entities.
- Confidence calibration: one minus absolute error between response correctness and trainee confidence, normalized to all entities.
- Track continuity: normalized recorded history/confidence for represented entities.
- Completion: entities with a submitted decision / total entities.
- Overall: detection 22%, classification 27%, decision 24%, calibration 12%, continuity 10%, completion 5%, minus a capped false-positive penalty.

The expected-response map is only a fictional training rubric. No LLM or local classifier is allowed to edit the ground truth or directly write scores.
