# AID-C2S V2 architecture

React presents the UI and Babylon.js renders the synthetic world. The simulation domain is isolated in TypeScript classes for deterministic scenario generation, sensor fusion, track lifecycle and scoring. IndexedDB is the browser persistence layer; an optional Node local API is included for future desktop/backend integration. AI interpretation is a provider abstraction and cannot change ground truth or scores.

## Main flow

Scenario DNA → synthetic entities → sensor observations → track association → trainee actions → events → deterministic score → session persistence → AAR/replay → adaptive next scenario.

## Deployment

Primary: browser/PWA.
Optional: Tauri 2 wrapper.
Optional: local Node API.

## Performance

Babylon uses efficient procedural primitives and a modest world footprint suitable for an RTX 4050-class student laptop. Media and ML are lazy/optional; offline core training is not dependent on either.
