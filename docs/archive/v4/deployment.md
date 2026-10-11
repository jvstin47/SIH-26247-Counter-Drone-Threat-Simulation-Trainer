# Deployment

## Browser / PWA

Run `npm run build`, then serve `dist/` from any static HTTPS host. The application contains a manifest and service worker for local-first deployment.

## Desktop

The core application is intentionally independent of any desktop shell. A Tauri 2 wrapper can be added once the Windows Rust/MSVC toolchain is available.
