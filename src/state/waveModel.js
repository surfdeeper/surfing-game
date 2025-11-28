// Wave Model - Time-based wave position calculation
// Wave position is derived from time, never stored/mutated

let nextWaveId = 1;

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
    return {
        id: `wave-${nextWaveId++}`,
        spawnTime,
        amplitude,
        type,
        // Track the last Y position where we deposited foam, to avoid duplicates
        lastFoamY: -1,
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
    return waves.filter(wave => !isWaveComplete(wave, currentTime, travelDuration));
}

/**
 * Convert wave amplitude to physical wave height in meters
 * @param {number} amplitude - Wave amplitude (0-1)
 * @returns {number} Wave height in meters
 */
export function amplitudeToHeight(amplitude) {
    // Map 0-1 amplitude to 0.5-3m wave height
    const minHeight = 0.5;  // meters
    const maxHeight = 3.0;  // meters
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
