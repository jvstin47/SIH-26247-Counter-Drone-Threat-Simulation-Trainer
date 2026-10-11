# Install AID-C2S V5 on Windows

## Recommended: one-click

1. Extract this project archive into its own folder (do not overlay the older V2/V4 folder).
2. Install Node.js 22.12+ / Node 24 LTS if it is not installed.
3. Double-click `START-AID-C2S-V5.bat`.
4. On first run it calls `npm.cmd install`. Allow it to complete and keep its terminal visible if an error appears.
5. A Vite server window opens; the browser opens `http://127.0.0.1:<stable-port>/#/command`.
6. Keep the server window open while using the app.

The launcher also tries to start an optional local API on `127.0.0.1:4177`. If that API cannot start, the core app still works using IndexedDB.

## Manual fallback

```cmd
cd /d "C:\Users\YOUR_USER\Videos\AID-C2S-V5-FINAL"
npm.cmd install
npm.cmd run dev
```

Use the URL printed by Vite; if port 3000 is occupied, the one-click launcher is preferred because it chooses/reuses a stable available port.

## Validation

```cmd
npm.cmd run validate:source
npm.cmd run test:offline
npm.cmd run test:backend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
```

You can also run `VERIFY-AID-C2S-V5.bat` to execute the validation sequence and save a log at `validation\latest-verification.log`.

If any command fails, preserve the exact terminal output. Do not mark the release fully validated until `typecheck`, lint, Vitest, Playwright and production build pass on the target Windows machine.

## Phone companion

Open `mobile-demo/index.html` from a phone file manager in a browser/HTML viewer. It is a standalone Canvas-based preview and does not require Node/npm; storage for a local file URL depends on the browser. It is not the full Babylon 3D app or an APK.

## Native desktop packaging

`src-tauri/` is optional. A Windows installer requires Rust and the MSVC C++ build tools/Windows SDK. Do not claim a verified EXE/MSI until `npm.cmd run build:desktop` succeeds on Windows with those prerequisites.
