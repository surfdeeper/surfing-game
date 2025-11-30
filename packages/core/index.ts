/**
 * @surf/core - Core game state and logic
 *
 * This package provides barrel exports for core game logic.
 * For conflicting names (e.g., multiple createInitialState functions),
 * import directly from the specific module:
 *   import { createInitialState } from '@surf/core/state/setLullModel'
 */

// Re-export all state models
// Note: Some exports may conflict - use specific module imports if needed
export * from '../../src/state/waveModel';
export * from '../../src/state/energyFieldModel';
export * from '../../src/state/foamModel';
export * from '../../src/state/foamGridModel';
export * from '../../src/state/backgroundWaveModel';
export * from '../../src/state/aiPlayerModel';
export * from '../../src/state/playerProxyModel';
export * from '../../src/state/settingsModel';
export * from '../../src/state/gamePersistence';

// These have conflicting exports - import directly from modules if needed:
// - src/state/bathymetryModel (amplitudeToHeight conflicts with waveModel)
// - src/state/setLullModel (createInitialState conflicts)
// - src/state/eventStore (createInitialState conflicts)

// Core utilities
export * from '../../src/core/math';

// Update loop
export * from '../../src/update';

// General utilities
export * from '../../src/util/fpsTracker';
