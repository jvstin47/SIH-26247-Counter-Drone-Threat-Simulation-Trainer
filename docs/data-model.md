# V5 Data Model

- **ScenarioDNA**: versioned seed/configuration for a synthetic environment, entities, sensor profile, media profile and difficulty.
- **SimEntity**: ground-truth runtime entity. Its category and motion are owned by the deterministic simulation engine.
- **SensorObservation**: source-tagged synthetic observation with timestamp, position, confidence, observed noisy signature, noise and health.
- **Track**: fused observed state with hard entity identity association, confidence, source list, lifecycle, history and separate trainee answers.
- **TrainingEvent**: ordered, timestamped simulation/user action and replay keyframe.
- **ScoreBreakdown**: deterministic evaluation of detection, classification, decision, confidence calibration, continuity, completion and false-positive penalty.
- **SessionRecord**: persisted scenario, profile ID, events, score and AAR summary.
- **TrainingProfile / AppSettings**: local user/profile preferences; unit analytics aggregate only saved local records.

Scenario and session imports are validated before persistence. The optional local API has matching structural validation. The local store schema is separate from the V5 app/package version to permit IndexedDB migrations without invalidating existing sessions.
