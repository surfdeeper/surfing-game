// Wave Model - Time-based wave position calculation
// Base progress derived from time, per-X progress stored for refraction

let nextWaveId = 1;

// INTENTIONAL BUG: Testing CI catches TypeScript errors
const testCIFailure: string = 42;

// Number of X samples for per-X progress tracking
export const WAVE_X_SAMPLES = 40;

/**
 * Wave types
 */
export const WAVE_TYPE = {
  BACKGROUND: 'background',
  SET: 'set',
};

/**
 * Create a new wave object
 * @param {number} spawnTime - Time when wave was spawned (ms since game start)
 * @param {number} amplitude - Wave amplitude (0-1)
 * @param {string} type - Wave type: 'background' or 'set' (defaults to 'set')
 * @returns {object} Immutable wave object
 */
export function createWave(spawnTime, amplitude, type = WAVE_TYPE.SET) {
  // Initialize per-X progress array - all start at 0 (horizon)
  const progressPerX = new Array(WAVE_X_SAMPLES).fill(0);

  return {
    id: `wave-${nextWaveId++}`,
    spawnTime,
    amplitude,
    type,
    // Track the last Y position where we deposited foam, to avoid duplicates
    lastFoamY: -1,
    // Per-X progress for wave refraction (bending based on bathymetry)
    // Each element is progress (0-1) at that X position
    progressPerX,
    // Track last update time for incremental updates
    lastUpdateTime: spawnTime,
  };
}

/**
 * Reset the wave ID counter (for testing)
 */
export function resetWaveIdCounter() {
  nextWaveId = 1;
}

/**
 * Calculate wave progress from horizon (0) to shore (1)
 * @param {object} wave - Wave object with spawnTime
 * @param {number} currentTime - Current game time in ms
 * @param {number} travelDuration - Time for wave to travel from horizon to shore in ms
 * @returns {number} Progress from 0 (horizon) to 1 (shore), clamped
 */
export function getWaveProgress(wave, currentTime, travelDuration) {
  const elapsed = currentTime - wave.spawnTime;
  return Math.min(1, Math.max(0, elapsed / travelDuration));
}

/**
 * Check if wave has completed its journey (past shore)
 * @param {object} wave - Wave object
 * @param {number} currentTime - Current game time in ms
 * @param {number} travelDuration - Time for wave to travel from horizon to shore in ms
 * @returns {boolean} True if wave is past shore
 */
export function isWaveComplete(wave, currentTime, travelDuration) {
  return getWaveProgress(wave, currentTime, travelDuration) >= 1;
}

/**
 * Filter out completed waves
 * @param {array} waves - Array of wave objects
 * @param {number} currentTime - Current game time in ms
 * @param {number} travelDuration - Time for wave to travel in ms
 * @returns {array} Waves that haven't reached shore yet
 */
export function getActiveWaves(waves, currentTime, travelDuration) {
  return waves.filter((wave) => !isWaveComplete(wave, currentTime, travelDuration));
}

/**
 * Convert wave amplitude to physical wave height in meters
 * @param {number} amplitude - Wave amplitude (0-1)
 * @returns {number} Wave height in meters
 */
export function amplitudeToHeight(amplitude) {
  // Map 0-1 amplitude to 0.5-3m wave height
  const minHeight = 0.5; // meters
  const maxHeight = 3.0; // meters
  return minHeight + (maxHeight - minHeight) * amplitude;
}

/**
 * Check if wave is currently breaking at a given depth
 * Uses the 0.78 breaker index rule: wave breaks when H > 0.78 * d
 *
 * No state tracking - just checks current conditions.
 * Wave breaks whenever it's over shallow enough water.
 * Can break, reform (deeper water), and break again multiple times.
 *
 * @param {object} wave - Wave object
 * @param {number} depth - Water depth at this position (meters)
 * @returns {boolean} True if wave is breaking at this depth
 */
export function isWaveBreaking(wave, depth) {
  // Get physical wave height
  const waveHeight = amplitudeToHeight(wave.amplitude);

  // Apply breaker index rule: H > 0.78 * d
  const breakerIndex = 0.78;
  return waveHeight > breakerIndex * depth;
}

// Minimum energy threshold for wave breaking
// Waves need sufficient energy to break; areas where energy was drained won't break again
export const MIN_ENERGY_FOR_BREAKING = 0.1;

/**
 * Check if wave is currently breaking, accounting for energy field
 * Requires both shallow water AND sufficient energy to break
 *
 * @param {object} wave - Wave object
 * @param {number} depth - Water depth at this position (meters)
 * @param {number} energyAtPoint - Energy level at this position (0-1+)
 * @returns {boolean} True if wave has enough energy and is in shallow enough water to break
 */
export function isWaveBreakingWithEnergy(wave, depth, energyAtPoint) {
  // Must have sufficient energy
  if (energyAtPoint < MIN_ENERGY_FOR_BREAKING) {
    return false;
  }

  // Standard breaking check
  return isWaveBreaking(wave, depth);
}

// Refraction strength: 0 = no bending, 1 = full physics
// Full physics (sqrt ratio) creates ~4x speed difference which is too extreme visually
// 0.3 gives subtle but visible bending
export const REFRACTION_STRENGTH = 0.3;

// Lateral diffusion: how much adjacent X slices influence each other
// This causes the wave to try to reform into a line after passing over bathymetry
// 0 = no diffusion (independent slices), 1 = instant equalization
// 0.15 gives gradual reformation while preserving some of the bend
export const LATERAL_DIFFUSION = 0.15;

/**
 * Update wave's per-X progress based on bathymetry (refraction)
 * Waves travel slower in shallow water: c = sqrt(g * depth)
 * This creates bending as different X positions advance at different rates
 *
 * The effect is dampened by REFRACTION_STRENGTH to avoid extreme visual artifacts.
 * Lateral diffusion causes the wave to gradually reform into a line.
 *
 * @param {object} wave - Wave object with progressPerX array
 * @param {number} currentTime - Current game time in ms
 * @param {number} baseTravelDuration - Base time for wave to travel horizon to shore (ms)
 * @param {function} getDepthFn - Function(normalizedX, progress) returning depth in meters
 * @param {number} deepDepth - Reference deep water depth (meters)
 */
export function updateWaveRefraction(
  wave,
  currentTime,
  baseTravelDuration,
  getDepthFn,
  deepDepth = 30
) {
  const dt = currentTime - wave.lastUpdateTime;
  if (dt <= 0) return;

  wave.lastUpdateTime = currentTime;

  // Base progress increment for this time step (in deep water)
  const baseIncrement = dt / baseTravelDuration;

  // Reference speed in deep water: c = sqrt(g * deepDepth)
  // We normalize speeds relative to this
  const g = 9.8; // gravity m/s²
  const deepSpeed = Math.sqrt(g * deepDepth);

  const n = wave.progressPerX.length;

  // Step 1: Apply bathymetry-based speed differences
  for (let i = 0; i < n; i++) {
    const normalizedX = (i + 0.5) / n;
    const currentProgress = wave.progressPerX[i];

    // Get depth at this X position and current progress
    const depth = getDepthFn(normalizedX, currentProgress);

    // Wave speed at this depth: c = sqrt(g * depth)
    // Clamp depth to avoid sqrt(0) and very slow speeds
    const clampedDepth = Math.max(0.5, depth);
    const localSpeed = Math.sqrt(g * clampedDepth);

    // Raw speed ratio from physics (can be ~0.25 for shallow vs deep)
    const rawSpeedRatio = localSpeed / deepSpeed;

    // Dampen the effect: blend between 1.0 (no refraction) and raw ratio
    // At REFRACTION_STRENGTH=0.3: shallow water at 0.25 ratio becomes 0.775 ratio
    const speedRatio = 1 - (1 - rawSpeedRatio) * REFRACTION_STRENGTH;

    // Apply increment scaled by speed ratio
    wave.progressPerX[i] = Math.min(1, currentProgress + baseIncrement * speedRatio);
  }

  // Step 2: Apply lateral diffusion (wave tries to reform into a line)
  // This simulates the connected nature of wave energy - tension along the wave
  if (LATERAL_DIFFUSION > 0) {
    // Scale diffusion by time step (larger dt = more diffusion)
    const diffusionAmount = LATERAL_DIFFUSION * Math.min(1, dt / 16.67); // normalized to 60fps

    // Make a copy to read from while writing
    const oldProgress = [...wave.progressPerX];

    for (let i = 0; i < n; i++) {
      // Get neighbors (wrap at edges to avoid boundary artifacts)
      const left = oldProgress[i > 0 ? i - 1 : i];
      const right = oldProgress[i < n - 1 ? i + 1 : i];
      const current = oldProgress[i];

      // Average of neighbors
      const neighborAvg = (left + right) / 2;

      // Blend toward neighbor average (reformation)
      // This pulls the wave toward being a straight line
      wave.progressPerX[i] = current + (neighborAvg - current) * diffusionAmount;

      // Clamp to valid range
      wave.progressPerX[i] = Math.min(1, Math.max(0, wave.progressPerX[i]));
    }
  }
}

/**
 * Get the average progress of a wave (for compatibility with existing code)
 * @param {object} wave - Wave object
 * @returns {number} Average progress across all X positions
 */
export function getAverageProgress(wave) {
  if (!wave.progressPerX || wave.progressPerX.length === 0) {
    return 0;
  }
  const sum = wave.progressPerX.reduce((a, b) => a + b, 0);
  return sum / wave.progressPerX.length;
}

/**
 * Get progress at a specific X position
 * @param {object} wave - Wave object
 * @param {number} normalizedX - X position (0-1)
 * @returns {number} Progress at that X position (0-1)
 */
export function getProgressAtX(wave, normalizedX) {
  if (!wave.progressPerX || wave.progressPerX.length === 0) {
    return 0;
  }
  // Find the index for this X position
  const index = Math.floor(normalizedX * wave.progressPerX.length);
  const clampedIndex = Math.max(0, Math.min(wave.progressPerX.length - 1, index));
  return wave.progressPerX[clampedIndex];
}
