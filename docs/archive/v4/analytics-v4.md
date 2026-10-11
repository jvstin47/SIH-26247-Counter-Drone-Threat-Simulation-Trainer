# Analytics and profiles — V4

Personal analytics filters stored sessions by the active local profile, then optionally filters by scenario environment and time period. Score trend points and skill bars are calculated from persisted session scores; no fixed demo numbers are inserted when a user has no records. Environment coverage is a count/percentage of the filtered records.

Unit analytics aggregates all local profiles and stored sessions. Profile coverage is the number of profiles with at least one saved session divided by total non-archived profiles. Creating, switching, renaming and archiving profiles changes local IndexedDB/local profile state; archiving never deletes that profile's historical session records. At least one profile must remain.
