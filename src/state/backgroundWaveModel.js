// Background Wave Model
// Spawns small, frequent, choppy waves that are always present
// These create the "texture" of the ocean and continue during lulls
//
// Unlike set waves (managed by setLullModel), background waves:
// - Are smaller amplitude (0.05 - 0.15)
// - Spawn more frequently (every 1-5 seconds vs 10-20 for sets)
// - Have more random spacing
// - Render behind set waves with reduced visual prominence

/**
 * Default configuration for background waves
 */
export const BACKGROUND_CONFIG = {
    minAmplitude: 0.05,         // Minimum amplitude for background waves
    maxAmplitude: 0.15,         // Maximum amplitude for background waves
    baseInterval: 3,            // Base seconds between waves
    intervalVariation: 2,       // ±seconds (so 1-5 second gaps)
};

/**
 * Create initial background wave state
 * @param {object} config - Configuration options (uses BACKGROUND_CONFIG if not provided)
 * @param {function} randomFn - Random function returning 0-1 (defaults to Math.random)
 * @returns {object} Initial state object
 */
export function createInitialBackgroundState(config = BACKGROUND_CONFIG, randomFn = Math.random) {
    return {
        timeSinceLastWave: 0,
        nextWaveTime: getNextBackgroundWaveTime(config, randomFn),
    };
}

/**
 * Random number in range [min, max]
 * @param {number} min
 * @param {number} max
 * @param {function} randomFn - Random function returning 0-1
 * @returns {number}
 */
function randomInRange(min, max, randomFn = Math.random) {
    return min + randomFn() * (max - min);
}

/**
 * Calculate next background wave spawn time
 * @param {object} config - Configuration with baseInterval and intervalVariation
 * @param {function} randomFn - Random function returning 0-1
 * @returns {number} Seconds until next wave
 */
export function getNextBackgroundWaveTime(config, randomFn = Math.random) {
    return config.baseInterval + randomInRange(-config.intervalVariation, config.intervalVariation, randomFn);
}

/**
 * Calculate amplitude for a background wave
 * @param {object} config - Configuration with minAmplitude and maxAmplitude
 * @param {function} randomFn - Random function returning 0-1
 * @returns {number} Amplitude 0.0-1.0
 */
export function calculateBackgroundAmplitude(config, randomFn = Math.random) {
    return randomInRange(config.minAmplitude, config.maxAmplitude, randomFn);
}

/**
 * Update background wave state for one time step
 *
 * @param {object} state - Current background wave state
 * @param {number} deltaTime - Time elapsed in seconds
 * @param {object} config - Configuration (uses BACKGROUND_CONFIG if not provided)
 * @param {function} randomFn - Random function returning 0-1 (defaults to Math.random)
 * @returns {object} Object with { state, shouldSpawn, amplitude }
 *   - state: Updated state object
 *   - shouldSpawn: Whether a background wave should be spawned this frame
 *   - amplitude: Amplitude for the wave (only valid if shouldSpawn is true)
 */
export function updateBackgroundWaveState(state, deltaTime, config = BACKGROUND_CONFIG, randomFn = Math.random) {
    // Advance timer
    const newTimeSinceLastWave = state.timeSinceLastWave + deltaTime;

    // Check if it's time to spawn
    const shouldSpawn = newTimeSinceLastWave >= state.nextWaveTime;

    let newState;
    let amplitude = 0;

    if (shouldSpawn) {
        amplitude = calculateBackgroundAmplitude(config, randomFn);
        newState = {
            timeSinceLastWave: 0,
            nextWaveTime: getNextBackgroundWaveTime(config, randomFn),
        };
    } else {
        newState = {
            ...state,
            timeSinceLastWave: newTimeSinceLastWave,
        };
    }

    return {
        state: newState,
        shouldSpawn,
        amplitude,
    };
}
