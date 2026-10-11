# Optional local API / backend — V5

The primary app is local-first: IndexedDB/Dexie powers training, scenarios, profiles, sessions and AAR so the core workflow works without a server. V5 adds a functional optional Node.js built-in HTTP API bound to `127.0.0.1:4177`; it is started by the Windows launcher and is surfaced in System → Local API archive.

## Routes

- `GET /api/health`
- `GET /api/state` and `GET /api/export`
- `POST /api/import` (schema validation; merge by ID by default, `merge:false` to replace)
- `GET/POST/DELETE /api/sessions`
- `GET/POST/DELETE /api/scenarios`
- `GET/POST/DELETE /api/profiles`
- `GET/PUT /api/settings`

## Persistence and safety

The API validates data shapes and score/scenario bounds, rejects unknown origins, has an 32 MB request body limit, atomically replaces its JSON state, and retains a `.bak` copy of the last state before subsequent writes. It binds only to the loopback interface. Runtime data lives in `server/data/` and is ignored by Git/release archives.

The System page can test service health, sync an IndexedDB export to the local API, and merge the API archive back into IndexedDB. This is a local archive/transfer utility, not a remote multi-user or authenticated production server. Core training is unaffected when the API is offline.
