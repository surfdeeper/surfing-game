/**
 * State Models - Re-export all state modules
 *
 * Note: Some modules have conflicting exports (e.g., amplitudeToHeight).
 * Import directly from submodules if you need specific versions.
 */

export * from './waveModel.js';
export * from './foamModel.js';
export * from './foamGridModel.js';
export * from './energyFieldModel.js';
export * from './playerProxyModel.js';
export * from './eventStore.js';

// bathymetryModel has amplitudeToHeight conflict with waveModel
export { getDepth, DEFAULT_BATHYMETRY } from './bathymetryModel.js';

// These need explicit exports
export { updateSetLullState } from './setLullModel.js';
export { updateBackgroundWaveState } from './backgroundWaveModel.js';
export { updateAIPlayer, createAIState, AI_MODE } from './aiPlayerModel.js';
export { updateSetting, clearSettings } from './settingsModel.js';
export { saveGameState, loadGameState } from './gamePersistence.js';
