// Set/Lull State Machine
// Pure functions for managing wave set and lull cycles
//
// State machine: LULL ↔ SET
// - LULL: Calm period with smaller waves, eventually transitions to SET
// - SET: Active period with larger waves following amplitude envelope

/**
 * Default configuration for set/lull behavior
 */
export const DEFAULT_CONFIG = {
    wavesPerSet: [4, 8],        // min/max waves per set
    lullWavesPerSet: [2, 4],   // min/max waves during lull mini-sets
    lullDuration: 30,           // base seconds between sets
    lullVariation: 5,           // +/- seconds
    peakPosition: 0.4,          // biggest wave at 40% through set
    minAmplitude: 0.3,          // smallest waves in set
    lullMaxAmplitude: 0.35,     // max amplitude during lull
    lullMinAmplitude: 0.15,     // min amplitude during lull
    swellPeriod: 15,            // base seconds between waves
    periodVariation: 5,         // +/- seconds of variation
};

/**
 * State constants
 */
export const STATE = {
    LULL: 'LULL',
    SET: 'SET',
};

/**
 * Create initial set/lull state
 * @param {object} config - Configuration options (uses DEFAULT_CONFIG if not provided)
 * @param {function} randomFn - Random function returning 0-1 (defaults to Math.random)
 * @returns {object} Initial state object
 */
export function createInitialState(config = DEFAULT_CONFIG, randomFn = Math.random) {
    const state = {
        setState: STATE.LULL,
        setTimer: 0,
        setDuration: 0,
        currentSetWaves: 0,
        wavesSpawned: 0,
        timeSinceLastWave: 0,
        nextWaveTime: 0,
    };

    // Initialize with a lull
    return initializeLull(state, config, randomFn);
}

/**
 * Random number in range [min, max]
 * @param {number} min
 * @param {number} max
 * @param {function} randomFn - Random function returning 0-1
 * @returns {number}
 */
export function randomInRange(min, max, randomFn = Math.random) {
    return min + randomFn() * (max - min);
}

/**
 * Calculate next wave spawn time
 * @param {object} config - Configuration with swellPeriod and periodVariation
 * @param {function} randomFn - Random function returning 0-1
 * @returns {number} Seconds until next wave
 */
export function getNextWaveTime(config, randomFn = Math.random) {
    return config.swellPeriod + randomInRange(-config.periodVariation, config.periodVariation, randomFn);
}

/**
 * Initialize a lull state (pure function)
 * @param {object} state - Current state
 * @param {object} config - Configuration
 * @param {function} randomFn - Random function returning 0-1
 * @returns {object} New state in LULL
 */
export function initializeLull(state, config, randomFn = Math.random) {
    const lullDuration = config.lullDuration +
        randomInRange(-config.lullVariation, config.lullVariation, randomFn);
    const currentSetWaves = Math.floor(randomInRange(
        config.lullWavesPerSet[0],
        config.lullWavesPerSet[1] + 1,
        randomFn
    ));

    return {
        ...state,
        setState: STATE.LULL,
        setTimer: 0,
        setDuration: lullDuration,
        currentSetWaves,
        wavesSpawned: 0,
        timeSinceLastWave: 0,
        nextWaveTime: getNextWaveTime(config, randomFn),
    };
}

/**
 * Initialize a set state (pure function)
 * @param {object} state - Current state
 * @param {object} config - Configuration
 * @param {function} randomFn - Random function returning 0-1
 * @returns {object} New state in SET
 */
export function initializeSet(state, config, randomFn = Math.random) {
    const currentSetWaves = Math.floor(randomInRange(
        config.wavesPerSet[0],
        config.wavesPerSet[1] + 1,
        randomFn
    ));
    // Estimate set duration based on waves * period (for UI display)
    const setDuration = (currentSetWaves - 1) * config.swellPeriod;

    return {
        ...state,
        setState: STATE.SET,
        setTimer: 0,
        setDuration,
        currentSetWaves,
        wavesSpawned: 0,
        timeSinceLastWave: 0,
        nextWaveTime: getNextWaveTime(config, randomFn),
    };
}

/**
 * Calculate amplitude based on progress through a set (0 to 1)
 * Uses a bell curve centered at peakPosition
 * @param {number} progress - Progress through set (0 = first wave, 1 = last wave)
 * @param {object} config - Configuration with peakPosition and minAmplitude
 * @returns {number} Amplitude 0.0-1.0
 */
export function calculateSetAmplitude(progress, config) {
    const peak = config.peakPosition;
    const min = config.minAmplitude;

    // Bell curve centered at peakPosition
    // Use a smooth envelope: ramp up, peak, ramp down
    let amplitude;
    if (progress < peak) {
        // Building phase: ease in from min to 1.0
        const t = progress / peak;
        amplitude = min + (1.0 - min) * (t * t); // quadratic ease in
    } else {
        // Fading phase: ease out from 1.0 to min
        const t = (progress - peak) / (1.0 - peak);
        amplitude = 1.0 - (1.0 - min) * (t * t); // quadratic ease out
    }
    return amplitude;
}

/**
 * Calculate amplitude for a lull wave
 * @param {object} config - Configuration with lullMinAmplitude and lullMaxAmplitude
 * @param {function} randomFn - Random function returning 0-1
 * @returns {number} Amplitude 0.0-1.0
 */
export function calculateLullAmplitude(config, randomFn = Math.random) {
    return randomInRange(config.lullMinAmplitude, config.lullMaxAmplitude, randomFn);
}

/**
 * Check if it's time to spawn a wave
 * @param {object} state - Current state
 * @returns {boolean}
 */
export function shouldSpawnWave(state) {
    return state.timeSinceLastWave >= state.nextWaveTime &&
           state.wavesSpawned < state.currentSetWaves;
}

/**
 * Get the amplitude for the next wave to spawn
 * @param {object} state - Current state
 * @param {object} config - Configuration
 * @param {function} randomFn - Random function returning 0-1
 * @returns {number} Amplitude 0.0-1.0
 */
export function getNextWaveAmplitude(state, config, randomFn = Math.random) {
    if (state.setState === STATE.LULL) {
        return calculateLullAmplitude(config, randomFn);
    } else {
        // Calculate progress through the set
        const progress = state.currentSetWaves > 1
            ? state.wavesSpawned / (state.currentSetWaves - 1)
            : config.peakPosition;
        return calculateSetAmplitude(progress, config);
    }
}

/**
 * Record that a wave was spawned (returns updated state)
 * @param {object} state - Current state
 * @param {object} config - Configuration
 * @param {function} randomFn - Random function returning 0-1
 * @returns {object} Updated state
 */
export function recordWaveSpawned(state, config, randomFn = Math.random) {
    return {
        ...state,
        wavesSpawned: state.wavesSpawned + 1,
        timeSinceLastWave: 0,
        nextWaveTime: getNextWaveTime(config, randomFn),
    };
}

/**
 * Update the set/lull state machine for one time step
 * This is the main update function called each frame
 *
 * @param {object} state - Current state
 * @param {number} deltaTime - Time elapsed in seconds
 * @param {object} config - Configuration (uses DEFAULT_CONFIG if not provided)
 * @param {function} randomFn - Random function returning 0-1 (defaults to Math.random)
 * @returns {object} Object with { state, shouldSpawn, amplitude }
 *   - state: Updated state object
 *   - shouldSpawn: Whether a wave should be spawned this frame
 *   - amplitude: Amplitude for the wave (only valid if shouldSpawn is true)
 */
export function updateSetLullState(state, deltaTime, config = DEFAULT_CONFIG, randomFn = Math.random) {
    // Advance timers
    let newState = {
        ...state,
        setTimer: state.setTimer + deltaTime,
        timeSinceLastWave: state.timeSinceLastWave + deltaTime,
    };

    // Check if it's time to spawn a wave
    const spawnWave = shouldSpawnWave(newState);
    let amplitude = 0;

    if (newState.setState === STATE.LULL) {
        // During lull, spawn smaller waves
        if (spawnWave) {
            amplitude = calculateLullAmplitude(config, randomFn);
            newState = recordWaveSpawned(newState, config, randomFn);
        }

        // If we've finished this mini-set of lull waves, start another
        if (newState.wavesSpawned >= newState.currentSetWaves) {
            newState = {
                ...newState,
                currentSetWaves: Math.floor(randomInRange(
                    config.lullWavesPerSet[0],
                    config.lullWavesPerSet[1] + 1,
                    randomFn
                )),
                wavesSpawned: 0,
            };
        }

        // Lull duration over, time for a real set
        if (newState.setTimer >= newState.setDuration) {
            newState = initializeSet(newState, config, randomFn);
        }
    } else if (newState.setState === STATE.SET) {
        // During set, spawn waves with envelope amplitude
        if (spawnWave) {
            // Calculate progress through the set
            const progress = newState.currentSetWaves > 1
                ? newState.wavesSpawned / (newState.currentSetWaves - 1)
                : config.peakPosition;
            amplitude = calculateSetAmplitude(progress, config);
            newState = recordWaveSpawned(newState, config, randomFn);
        }

        // Set complete, start lull
        if (newState.wavesSpawned >= newState.currentSetWaves) {
            newState = initializeLull(newState, config, randomFn);
        }
    }

    return {
        state: newState,
        shouldSpawn: spawnWave,
        amplitude,
    };
}
