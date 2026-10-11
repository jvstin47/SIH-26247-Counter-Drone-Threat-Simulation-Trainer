# Event and replay model — V4

The engine emits typed events for scenario start/end, entity lifecycle, track transitions, classification, decision, sensor-state changes, periodic sensor summaries, and 500 ms replay keyframes. The AAR timeline is built from the actual session event array persisted with the record.

The replay view seeks by event index, derives the selected event time, and draws the latest stored track keyframe whose timestamp is at or before that time. The UI supports play/pause, step backward/forward, first/last event, seek and playback rates from 0.5× to 4×. JSON export includes the scenario seed, event stream, score breakdown and session metadata.

A keyframe replay is intended for analysis/debugging, not pixel-identical cross-GPU rendering. Actual scene pixels can differ across devices.
