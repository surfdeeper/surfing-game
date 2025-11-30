/**
 * Game State Persistence - Save/load game state to localStorage
 *
 * Handles:
 * - Periodic auto-save during gameplay
 * - State restoration on page load
 * - Migration of old data formats
 * - Validation of restored timestamps
 */

import { WAVE_X_SAMPLES } from './waveModel.js';
import { DEFAULT_CONFIG, createSetLullState } from './setLullModel.js';

const STORAGE_KEY = 'gameState';

/**
 * Save current game state to localStorage
 * @param {object} world - Current world state
 * @param {object} settings - Current settings (for timeScale)
 */
export function saveGameState(world, settings) {
  const state = {
    gameTime: world.gameTime,
    timeScale: settings.timeScale,
    waves: world.waves,
    foamSegments: world.foamSegments,
    setLullState: world.setLullState,
    backgroundState: world.backgroundState,
    playerProxy: world.playerProxy,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Load game state from localStorage and apply to world
 * @param {object} world - World state to mutate
 * @param {function} updateSettings - Callback to update settings (timeScale)
 * @returns {boolean} True if state was loaded successfully
 */
export function loadGameState(world, updateSettings) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;

  try {
    const state = JSON.parse(saved);
    world.gameTime = state.gameTime || 0;

    // Restore timeScale via callback
    if (state.timeScale && updateSettings) {
      updateSettings(state.timeScale);
    }

    // Migrate waves to ensure they have progressPerX (added in wave refraction feature)
    world.waves = (state.waves || []).map((wave) => ({
      ...wave,
      progressPerX: wave.progressPerX || new Array(WAVE_X_SAMPLES).fill(0),
      lastUpdateTime: wave.lastUpdateTime ?? wave.spawnTime,
    }));

    world.foamSegments = state.foamSegments || [];

    if (state.setLullState) {
      // Validate timestamps aren't corrupted (stale data from previous session)
      const sls = state.setLullState;
      const timeSinceLastWave = (world.gameTime - sls.lastWaveSpawnTime) / 1000;
      const elapsedInState = (world.gameTime - sls.stateStartTime) / 1000;

      // If timers are negative or absurdly large, reset state
      if (
        timeSinceLastWave < 0 ||
        timeSinceLastWave > 300 ||
        elapsedInState < 0 ||
        elapsedInState > 300
      ) {
        console.warn('Stale setLullState detected, reinitializing');
        world.setLullState = createSetLullState(DEFAULT_CONFIG, Math.random, world.gameTime);
      } else {
        world.setLullState = sls;
      }
    }

    if (state.backgroundState) world.backgroundState = state.backgroundState;
    if (state.playerProxy) world.playerProxy = state.playerProxy;

    return true;
  } catch (e) {
    console.warn('Failed to load game state:', e);
    return false;
  }
}

/**
 * Check if it's time to auto-save (every ~1 second of game time)
 * @param {number} gameTime - Current game time in ms
 * @param {number} previousGameTime - Game time before this frame
 * @returns {boolean} True if should save
 */
export function shouldAutoSave(gameTime, previousGameTime) {
  return Math.floor(gameTime / 1000) !== Math.floor(previousGameTime / 1000);
}
