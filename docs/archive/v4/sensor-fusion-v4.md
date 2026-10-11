# Synthetic sensor channels — V4

Four synthetic channels are implemented: `VISUAL`, `RADAR_SYNTH`, `RF_LIKE`, and `THERMAL_LIKE`. Each observation contains a timestamp, synthetic position estimate, confidence, noise, health, occlusion flag, quality class, source and optional simulator-only entity association.

Visibility, sensor health and background activity alter the quality/noise of observations. Ambiguous false returns are rate-limited to a single generation opportunity per 1.8-second time bucket; a failed random opportunity does not retry every simulation frame. The training interface displays evidence/quality rather than revealing entity truth. All values are fictional and are not real sensor specifications.
