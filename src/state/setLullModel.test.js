import { describe, it, expect } from 'vitest';
import {
    DEFAULT_CONFIG,
    STATE,
    createInitialState,
    randomInRange,
    getNextWaveTime,
    initializeLull,
    initializeSet,
    calculateSetAmplitude,
    calculateLullAmplitude,
    shouldSpawnWave,
    getNextWaveAmplitude,
    recordWaveSpawned,
    updateSetLullState,
} from './setLullModel.js';

// Fixed random function for deterministic tests
const fixedRandom = (value) => () => value;

describe('setLullModel', () => {
    describe('createInitialState', () => {
        it('should create state in LULL mode', () => {
            const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            expect(state.setState).toBe(STATE.LULL);
        });

        it('should initialize timers to zero', () => {
            const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            expect(state.setTimer).toBe(0);
            expect(state.timeSinceLastWave).toBe(0);
            expect(state.wavesSpawned).toBe(0);
        });

        it('should set lull duration with variation', () => {
            // random = 0.5 means middle of variation range
            const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            expect(state.setDuration).toBe(DEFAULT_CONFIG.lullDuration); // 30s + 0 variation
        });

        it('should set wave count from lull config', () => {
            // random = 0.5 -> Math.floor(2 + 0.5 * 3) = Math.floor(3.5) = 3
            const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            expect(state.currentSetWaves).toBeGreaterThanOrEqual(DEFAULT_CONFIG.lullWavesPerSet[0]);
            expect(state.currentSetWaves).toBeLessThanOrEqual(DEFAULT_CONFIG.lullWavesPerSet[1]);
        });
    });

    describe('randomInRange', () => {
        it('should return min when random is 0', () => {
            expect(randomInRange(10, 20, fixedRandom(0))).toBe(10);
        });

        it('should return max when random is 1', () => {
            expect(randomInRange(10, 20, fixedRandom(1))).toBe(20);
        });

        it('should return midpoint when random is 0.5', () => {
            expect(randomInRange(10, 20, fixedRandom(0.5))).toBe(15);
        });
    });

    describe('getNextWaveTime', () => {
        it('should return swellPeriod with no variation when random is 0.5', () => {
            const time = getNextWaveTime(DEFAULT_CONFIG, fixedRandom(0.5));
            expect(time).toBe(DEFAULT_CONFIG.swellPeriod); // 15s
        });

        it('should return min time when random is 0', () => {
            const time = getNextWaveTime(DEFAULT_CONFIG, fixedRandom(0));
            expect(time).toBe(DEFAULT_CONFIG.swellPeriod - DEFAULT_CONFIG.periodVariation); // 10s
        });

        it('should return max time when random is 1', () => {
            const time = getNextWaveTime(DEFAULT_CONFIG, fixedRandom(1));
            expect(time).toBe(DEFAULT_CONFIG.swellPeriod + DEFAULT_CONFIG.periodVariation); // 20s
        });
    });

    describe('initializeLull', () => {
        it('should set state to LULL', () => {
            const prevState = { setState: STATE.SET };
            const newState = initializeLull(prevState, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(newState.setState).toBe(STATE.LULL);
        });

        it('should reset timers', () => {
            const prevState = { setTimer: 100, timeSinceLastWave: 50 };
            const newState = initializeLull(prevState, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(newState.setTimer).toBe(0);
            expect(newState.timeSinceLastWave).toBe(0);
            expect(newState.wavesSpawned).toBe(0);
        });

        it('should calculate lull duration within range', () => {
            const state = initializeLull({}, DEFAULT_CONFIG, fixedRandom(0));
            // random=0 -> lullDuration + (-lullVariation) = 30 - 5 = 25
            expect(state.setDuration).toBe(25);
        });
    });

    describe('initializeSet', () => {
        it('should set state to SET', () => {
            const prevState = { setState: STATE.LULL };
            const newState = initializeSet(prevState, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(newState.setState).toBe(STATE.SET);
        });

        it('should reset timers and wave count', () => {
            const prevState = { setTimer: 100, wavesSpawned: 5 };
            const newState = initializeSet(prevState, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(newState.setTimer).toBe(0);
            expect(newState.wavesSpawned).toBe(0);
        });

        it('should set wave count from set config', () => {
            // random = 0.5 -> Math.floor(4 + 0.5 * 5) = Math.floor(6.5) = 6
            const state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(state.currentSetWaves).toBe(6);
        });

        it('should estimate set duration based on waves * period', () => {
            const state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
            // 6 waves -> (6-1) * 15 = 75s
            expect(state.setDuration).toBe((state.currentSetWaves - 1) * DEFAULT_CONFIG.swellPeriod);
        });
    });

    describe('calculateSetAmplitude', () => {
        it('should return minAmplitude at progress 0', () => {
            const amp = calculateSetAmplitude(0, DEFAULT_CONFIG);
            expect(amp).toBe(DEFAULT_CONFIG.minAmplitude);
        });

        it('should return 1.0 at peak position', () => {
            const amp = calculateSetAmplitude(DEFAULT_CONFIG.peakPosition, DEFAULT_CONFIG);
            expect(amp).toBe(1.0);
        });

        it('should return minAmplitude at progress 1', () => {
            const amp = calculateSetAmplitude(1, DEFAULT_CONFIG);
            expect(amp).toBeCloseTo(DEFAULT_CONFIG.minAmplitude, 10);
        });

        it('should increase amplitude from start to peak', () => {
            const amp1 = calculateSetAmplitude(0.1, DEFAULT_CONFIG);
            const amp2 = calculateSetAmplitude(0.2, DEFAULT_CONFIG);
            expect(amp2).toBeGreaterThan(amp1);
        });

        it('should decrease amplitude from peak to end', () => {
            const amp1 = calculateSetAmplitude(0.5, DEFAULT_CONFIG);
            const amp2 = calculateSetAmplitude(0.8, DEFAULT_CONFIG);
            expect(amp1).toBeGreaterThan(amp2);
        });
    });

    describe('calculateLullAmplitude', () => {
        it('should return min amplitude when random is 0', () => {
            const amp = calculateLullAmplitude(DEFAULT_CONFIG, fixedRandom(0));
            expect(amp).toBe(DEFAULT_CONFIG.lullMinAmplitude);
        });

        it('should return max amplitude when random is 1', () => {
            const amp = calculateLullAmplitude(DEFAULT_CONFIG, fixedRandom(1));
            expect(amp).toBe(DEFAULT_CONFIG.lullMaxAmplitude);
        });

        it('should always be less than set peak amplitude', () => {
            const lullAmp = calculateLullAmplitude(DEFAULT_CONFIG, fixedRandom(1));
            expect(lullAmp).toBeLessThan(1.0);
        });
    });

    describe('shouldSpawnWave', () => {
        it('should return false if not enough time has passed', () => {
            const state = {
                timeSinceLastWave: 5,
                nextWaveTime: 15,
                wavesSpawned: 0,
                currentSetWaves: 5,
            };
            expect(shouldSpawnWave(state)).toBe(false);
        });

        it('should return true when time has elapsed and waves remain', () => {
            const state = {
                timeSinceLastWave: 15,
                nextWaveTime: 15,
                wavesSpawned: 0,
                currentSetWaves: 5,
            };
            expect(shouldSpawnWave(state)).toBe(true);
        });

        it('should return false when all waves spawned', () => {
            const state = {
                timeSinceLastWave: 20,
                nextWaveTime: 15,
                wavesSpawned: 5,
                currentSetWaves: 5,
            };
            expect(shouldSpawnWave(state)).toBe(false);
        });
    });

    describe('recordWaveSpawned', () => {
        it('should increment wavesSpawned', () => {
            const state = { wavesSpawned: 2 };
            const newState = recordWaveSpawned(state, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(newState.wavesSpawned).toBe(3);
        });

        it('should reset timeSinceLastWave to 0', () => {
            const state = { wavesSpawned: 2, timeSinceLastWave: 15 };
            const newState = recordWaveSpawned(state, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(newState.timeSinceLastWave).toBe(0);
        });

        it('should set a new nextWaveTime', () => {
            const state = { wavesSpawned: 2, nextWaveTime: 15 };
            const newState = recordWaveSpawned(state, DEFAULT_CONFIG, fixedRandom(0.3));
            // New time should be recalculated
            expect(newState.nextWaveTime).toBeDefined();
        });
    });

    describe('updateSetLullState', () => {
        describe('timer advancement', () => {
            it('should advance setTimer by deltaTime', () => {
                const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const { state: newState } = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(newState.setTimer).toBe(1.0);
            });

            it('should advance timeSinceLastWave by deltaTime', () => {
                const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const { state: newState } = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(newState.timeSinceLastWave).toBe(1.0);
            });

            it('should accumulate time over multiple updates', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                state = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5)).state;
                state = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5)).state;
                state = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5)).state;
                expect(state.setTimer).toBe(3.0);
            });
        });

        describe('LULL state behavior', () => {
            it('should stay in LULL until duration elapses', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                // Initial lull duration is ~30s
                state = updateSetLullState(state, 10.0, DEFAULT_CONFIG, fixedRandom(0.5)).state;
                expect(state.setState).toBe(STATE.LULL);
            });

            it('should transition to SET after lull duration', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                // Advance past lull duration (30s)
                state = updateSetLullState(state, 31.0, DEFAULT_CONFIG, fixedRandom(0.5)).state;
                expect(state.setState).toBe(STATE.SET);
            });

            it('should spawn lull waves at correct intervals', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                // First wave spawns when timeSinceLastWave >= nextWaveTime
                // nextWaveTime with random=0.5 is 15s
                const result = updateSetLullState(state, 16.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(true);
                expect(result.amplitude).toBeGreaterThanOrEqual(DEFAULT_CONFIG.lullMinAmplitude);
                expect(result.amplitude).toBeLessThanOrEqual(DEFAULT_CONFIG.lullMaxAmplitude);
            });
        });

        describe('SET state behavior', () => {
            it('should spawn waves with envelope amplitude', () => {
                // Create state already in SET
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
                // Advance to spawn first wave
                state.timeSinceLastWave = 16;

                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(true);
                // First wave (progress=0) should have minAmplitude
                expect(result.amplitude).toBe(DEFAULT_CONFIG.minAmplitude);
            });

            it('should transition to LULL after all waves spawned', () => {
                // Create state already in SET with all waves spawned
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
                state.wavesSpawned = state.currentSetWaves;

                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setState).toBe(STATE.LULL);
            });
        });

        describe('wave spawning logic', () => {
            it('should not spawn when time has not elapsed', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const result = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(false);
            });

            it('should reset timeSinceLastWave after spawning', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                state.timeSinceLastWave = 16; // Ready to spawn
                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(true);
                expect(result.state.timeSinceLastWave).toBe(0);
            });

            it('should increment wavesSpawned after spawning', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const initialSpawned = state.wavesSpawned;
                state.timeSinceLastWave = 16; // Ready to spawn
                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.wavesSpawned).toBe(initialSpawned + 1);
            });
        });

        describe('mini-set cycling in LULL', () => {
            it('should start new mini-set when lull waves complete', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                // Set up state where all lull waves have spawned
                state.wavesSpawned = state.currentSetWaves;

                // Not enough time for state transition, but mini-set should reset
                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.wavesSpawned).toBe(0);
                expect(result.state.currentSetWaves).toBeGreaterThanOrEqual(DEFAULT_CONFIG.lullWavesPerSet[0]);
            });
        });
    });

    describe('full cycle simulation', () => {
        it('should complete LULL → SET → LULL cycle', () => {
            let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            expect(state.setState).toBe(STATE.LULL);

            // Advance through lull (30s)
            for (let t = 0; t < 35; t++) {
                const result = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                state = result.state;
            }
            expect(state.setState).toBe(STATE.SET);

            // Advance through set - need to spawn all waves
            // Each wave takes ~15s to spawn, set has 6 waves
            for (let t = 0; t < 100; t++) {
                const result = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                state = result.state;
                if (state.setState === STATE.LULL) break;
            }
            expect(state.setState).toBe(STATE.LULL);
        });

        it('should spawn multiple waves over simulation', () => {
            let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            let totalSpawns = 0;

            // Simulate 2 minutes
            for (let t = 0; t < 120; t++) {
                const result = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                state = result.state;
                if (result.shouldSpawn) totalSpawns++;
            }

            // Should have spawned several waves in 2 minutes
            expect(totalSpawns).toBeGreaterThan(5);
        });
    });
});
