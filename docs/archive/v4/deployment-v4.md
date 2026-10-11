# Deployment — V4

## Windows browser mode

Use `START-AID-C2S-V4.bat`. It verifies Node/npm and dependencies, launches `scripts/start-v4.ps1`, persists a stable local port to `%APPDATA%\AID-C2S-V4\port.txt`, reuses a matching project server where possible, waits for an HTTP response, and opens `http://127.0.0.1:<stable-port>/#/command`. Stable port reuse avoids fragmenting IndexedDB across random browser origins.

`STOP-AID-C2S-V4.bat` stops Vite/node processes whose command line matches the current project root; it does not kill unrelated Node applications. `RESTART-AID-C2S-V4.bat` wraps stop/start. Manual dev mode is `npm.cmd run dev` and defaults to port 3000 with strict port checking.

## Production

`npm.cmd run build` generates `dist/`. Serve the `dist` directory from a static HTTP server for production. The service worker is only registered in production. Load once while online so the app shell and local evidence clips are cached, then test offline reload.

## Optional Tauri

`src-tauri/` is an optional wrapper configuration. A real Windows installer requires Rust, the MSVC C++ build tools, the Windows SDK and WebView2. The V4 browser app does not depend on Tauri and should be the primary SIH demo until `npm.cmd run build:desktop` has been verified on the target PC.
