# Surfing Game Architecture (Living Doc)

Purpose: keep a concise, up-to-date mental model of the game's layers, design decisions, and testing workflows. Update this doc alongside significant code changes.

- Scope: core architecture, update/render loop, major subsystems, testing and debug tools.
- Sources of truth: production code in `src/`, especially `src/main.tsx` as the integration point.

## High-Level Flow

- Time-based simulation: waves store `spawnTime`; position is derived from `(now - spawnTime) / travelDuration`, keeping behavior deterministic.
- Event-sourced state: `src/state/eventStore.ts` owns the canonical game state; all mutations are dispatched events (or batchDispatch) for easy replay and testing.
- Game loop (see `src/main.tsx`):
  1. `fpsTracker` computes `deltaTime` (resets on tab visibility change).
  1. `update(...)` advances game time, spawns waves, updates energy + foam grids, player/AI, and persistence.
  1. `draw(...)` renders bathymetry, energy field, waves, foam contours, debug overlays, and player proxy.
- Coordinate system: horizon at top of canvas, shore at bottom; `render/coordinates.ts` maps normalized progress to screen space and travel duration.

## Layer Overview

- **State + Persistence**
  - `eventStore.ts`: defines event types, reducer, singleton store, replay/history helpers.
  - Models: `waveModel.ts`, `setLullModel.ts`, `backgroundWaveModel.ts`, `energyFieldModel.ts`, `foamGridModel.ts`, `playerProxyModel.ts`, `aiPlayerModel.ts`, `bathymetryModel.ts`.
  - Persistence: `gamePersistence.ts` (autosave game state + time scale), `settingsModel.ts` (toggles, numeric settings) using `localStorage`.
- **Update Orchestrator (`update/index.ts`)**
  - Pure, testable functions that operate on plain objects and return new state or events.
  - Responsibilities: set/lull state machine, background spawn cadence, refraction updates, foam/energy transfer pipeline, player proxy + AI control, helper exports for coordinate math and energy injection.
- **Rendering (`render/`)**
  - `waveRenderer.ts`: slice-based gradients per wave with refraction-aware `progressPerX`.
  - `foamConfig.ts` + `marchingSquares.ts`: converts foam grids to contour paths; multiple visual options.
  - `energyFieldRenderer.ts`: draws continuous energy field when toggled.
  - `bathymetryRenderer.ts`: caches depth heatmaps (`createBathymetryCacheManager`) to avoid per-frame recompute.
- **Input + UI**
  - `input/keyboard.ts` + `input/keyboardHandler.ts`: WASD/arrow bindings and toggle hotkeys (bathymetry, energy, player, AI, etc.).
  - React debug panel (`ui/debugPanelManager.tsx`) renders controls, metrics (FPS, foam counts), and settings in sync with the store.
- **Core Utilities**
  - `core/` math helpers, `util/fpsTracker.ts` for timing, `render/coordinates.ts` for consistent ocean bounds/progress mapping.

## Key Subsystems & Decisions

- **Wave Lifecycle**
  - Two sources: set waves (`setLullModel`) and continuous background waves (`backgroundWaveModel`), both emit `EventType.WAVE_SPAWN`.
  - `updateWaves` filters to active waves and updates refraction per X-slice using bathymetry depth; painter’s algorithm sorts by progress during render.
  - Travel duration derived from bathymetry and swell speed (`calculateTravelDuration`) keeps timing consistent when ocean height changes.
- **Energy Field**
  - Continuous grid (`energyFieldModel`) representing wave energy; updated every frame with depth-based damping and downward blending.
  - Discrete wave spawns inject horizon pulses (`injectWavePulse`), keeping discrete and continuous models in sync.
- **Foam Pipeline**
  - Energy → transfer grid → foam grid: `updateFoamGridsFromWaves` scans breaking regions, drains energy (`drainEnergyAt`), accumulates into `energyTransferGrid`, then `updateFoamLayer` deposits + decays + advects shoreward.
  - Rendering uses marching squares on the foam grid; optional debug layer shows per-cell samples/transfer frame.
- **Bathymetry**
  - Depth map influences refraction, energy damping, and foam deposition thresholds; render cache invalidated on resize to match canvas bounds.
- **Player Proxy + AI**
  - Player represented by a proxy (`playerProxyModel`); optional AI modes (`aiPlayerModel`) can drive movement, with last AI input drawn as an indicator.
  - Input is merged in `updatePlayer`; movement respects ocean bounds, foam sampling, and configured speed/drag (`PLAYER_PROXY_CONFIG`).
- **Toggles & Time Scale**
  - Stored in the event store; adjusted via keyboard or debug panel; persisted through `settingsModel`. Time scale feeds the entire simulation, including tests.
- **Render Order (from `draw` in main)**
  - Ocean fill → optional bathymetry heatmap → optional energy field → shore strip → waves → foam contours → optional foam samples → player/AI overlays → debug panel UI.

## Testing & Feedback Loops

- Fast path: `npm run lint` for syntax/import issues; then smoke test `npx playwright test tests/smoke.spec.js:3` to ensure the app loads.
- Targeted unit tests: `npx vitest run src/state/energyFieldModel.test.ts`, `npx vitest run src/update/index.test.ts`, etc. Prefer subsystem-specific files rather than full suite.
- Visual regression: `npm run test:visual:headless` (or `npm run test:visual:update:headless` to refresh baselines).
- E2E: `npm run test:e2e` when changing integration points or user flows.
- Determinism: most subsystems are pure and time-based; tests should create state via event store or pure helpers (avoid duplicating logic outside production modules).
- Smoke after changes: always rerun the smoke test to catch broken imports or runtime errors not covered by unit tests.

## Debugging & Observability

- Debug panel exposes toggles (bathymetry, energy, foam options, player/AI), numeric settings, FPS, foam/transfer counts, and time scale.
- Dev-only globals: `window.toggles`, `window.AI_MODE`, `window.createAIState`, and `window.world` (getter) aid E2E and manual inspection.
- Bathymetry cache invalidates on resize; if visuals look stale after layout changes, check cache invalidation paths.
- For performance, many updates use deferred clones and batch dispatch; when adding new state, follow the same pattern to avoid unnecessary renders.

## Working Agreements for Updates

- Extend this doc whenever architecture, pipelines, or test workflows change (new layers, new toggles, new grids, new state machines).
- Keep examples grounded in production code paths; avoid describing helpers that are not used in `main.tsx` or orchestrators.
- Prefer single-source helpers: extract logic only when immediately wired into production and tests.
