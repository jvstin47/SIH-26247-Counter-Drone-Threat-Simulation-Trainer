# V5 Replay Design

The engine emits ordered, timestamped events and periodic keyframes. Each completed `SessionRecord` retains the scenario seed/configuration, trainee actions, score inputs, sensor state changes and replay data. AAR replay moves through the persisted event/keyframe timeline and shows the hidden ground truth only during review, not normal training.

The deterministic engine is the authoritative source of state. Replay does not recalculate the score from UI state; it displays saved score inputs and reconstructable snapshots. Pixel-identical rendering across different browsers/GPUs is not guaranteed, but state/event order should remain deterministic for the same seed and inputs.
