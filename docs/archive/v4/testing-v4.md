# Testing — V4

## Automated

- Vitest covers seeded scenario generation, scenario schema validation, tracking association/lifecycle, sensor-fusion determinism and false-return rate, scoring normalization/ground-truth isolation, adaptive difficulty and local classifier behavior.
- Playwright smoke tests cover dashboard-to-scenario navigation, scenario persistence actions, and the core training interaction sequence in installed Chrome.
- Parser scan in the build environment checks all `.ts`/`.tsx` files for syntax diagnostics.

## Run locally

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Playwright requires installed Google Chrome for this project's `channel: 'chrome'` configuration. If Chrome isn't installed, install Chromium using Playwright and edit the project channel. Do not mark the browser/production checklist as passed until these commands finish successfully on the target Windows PC.
