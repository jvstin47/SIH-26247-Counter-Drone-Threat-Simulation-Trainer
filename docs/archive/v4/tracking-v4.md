# Tracking subsystem — V4

The `TrackManager` consumes synthetic `SensorObservation` records and maintains track ids, estimated position/velocity, confidence, sources, age/last-seen, lifecycle state and bounded history. Associations use a deterministic nearest-neighbour distance gate that widens modestly with the scenario's tracking-difficulty setting. Position and velocity updates are smoothed; history is bounded to limit memory use.

Lifecycle labels include newly created, acquired, tracking, uncertain, lost, reacquired, classified and resolved. Fresh observations no longer overwrite `CLASSIFIED`/`RESOLVED` state immediately. The engine emits transitions into its event stream for AAR/history.

False returns use `entityId: null` internally; a false track is not converted into a ground-truth entity merely because a nearby observation arrives. The system intentionally permits association errors under higher synthetic ambiguity as a training effect. This is a deterministic demonstration algorithm, not a validated operational multi-target tracker.
