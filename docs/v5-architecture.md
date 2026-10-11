# AID-C2S V5 architecture

## Runtime boundaries

```text
React application / routed view components
          │
          ├── local store (Zustand)
          ├── repository adapter (Dexie / IndexedDB)
          ├── local scenario authoring / validation
          ├── local synthetic classifier (runtime-trained multinomial logistic model)
          └── Babylon renderer (WebGPU when available, WebGL fallback)
                      │
        Deterministic simulation engine (fixed step)
                      │
       entities → observations → track association
                      │
         event log / periodic keyframes / scoring
                      │
            persisted session → AAR / replay

Optional local API (127.0.0.1:4177)
  ├── schema validation
  ├── profiles/scenarios/sessions/settings endpoints
  ├── backup import/export merge
  └── atomic JSON writes + previous-state backup
```

## Invariants

- Simulation ground truth is owned by the deterministic simulation domain.
- Trainee classifications/confidence/decisions are separate track fields and do not overwrite `SimEntity.category`.
- Track association cannot fuse a non-null synthetic entity ID into a ghost (`null`) or another entity ID.
- Classified/resolved tracks continue to update predicted kinematics so the tracker does not create duplicates solely because a resolved track stopped moving.
- Scoring is a pure deterministic calculation from persisted entities/tracks/session inputs. AI suggestions cannot mutate scores.
- Core training works with only browser dependencies and IndexedDB; the loopback API is optional.
- WebGPU and WebXR are optional. Rendering falls back to WebGL/desktop interaction where the browser does not support those capabilities.

## Persistence

Browser records live in IndexedDB through Dexie. Full backup import validates scenario, session, profile and settings structure before merging. The optional local API stores a separate machine-local JSON archive; it is bound to `127.0.0.1`, checks request size and object schemas, writes atomically, and preserves a `.bak` file before replacing state.

## Visual/media model

The 3D world, sensor observations and bundled MP4 clips are synthetic. The phone companion at `mobile-demo/index.html` is a separate lightweight Canvas-based UI for viewing and trying the core flow without Node/npm. It is not the full Babylon renderer.
