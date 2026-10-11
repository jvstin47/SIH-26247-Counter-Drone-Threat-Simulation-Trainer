# V5 Scoring Design

Scoring is deterministic TypeScript code. It evaluates:

- detection latency / detection coverage
- classification correctness against hidden synthetic entity categories
- abstract decision correctness from the scenario training policy
- confidence calibration
- track continuity
- task completion
- false-positive penalty for classified ghost/false contacts

Score components and their source inputs are retained for AAR explanation. A trainee answer lives on a `Track` as `traineeClassification`, `traineeConfidence` and `decision`; it never overwrites `SimEntity.category`. The local classifier and instructor do not modify score truth.

The score weights are defined in `src/simulation/scoring.ts`; consult that file as the source of truth if weights change. Do not hard-code weight values into presentation documentation.
