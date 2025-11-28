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
    recordWaveSpawned,
    updateSetLullState,
    computeDerivedTimers,
} from './setLullModel.js';

// Fixed random function for deterministic tests
const fixedRandom = (value) => () => value;

// Helper to convert seconds to ms for gameTime
const sec = (s) => s * 1000;

describe('setLullModel', () => {
    describe('createInitialState', () => {
        it('should create state in LULL mode', () => {
            const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            expect(state.setState).toBe(STATE.LULL);
        });

        it('should initialize timestamps to gameTime', () => {
            const gameTime = 5000; // 5 seconds in
            const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), gameTime);
            expect(state.stateStartTime).toBe(gameTime);
            expect(state.lastWaveSpawnTime).toBe(gameTime);
            expect(state.wavesSpawned).toBe(0);
            // Derived timers should be 0 when computed
            const derived = computeDerivedTimers(state, gameTime);
            expect(derived.setTimer).toBe(0);
            expect(derived.timeSinceLastWave).toBe(0);
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

        it('should set timestamps to current gameTime', () => {
            const gameTime = 50000; // 50 seconds
            const prevState = { stateStartTime: 0, lastWaveSpawnTime: 10000 };
            const newState = initializeLull(prevState, DEFAULT_CONFIG, fixedRandom(0.5), gameTime);
            expect(newState.stateStartTime).toBe(gameTime);
            expect(newState.lastWaveSpawnTime).toBe(gameTime);
            expect(newState.wavesSpawned).toBe(0);
            // Derived timers should be 0
            const derived = computeDerivedTimers(newState, gameTime);
            expect(derived.setTimer).toBe(0);
            expect(derived.timeSinceLastWave).toBe(0);
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

        it('should set timestamps and reset wave count', () => {
            const gameTime = 60000; // 60 seconds
            const prevState = { stateStartTime: 0, wavesSpawned: 5 };
            const newState = initializeSet(prevState, DEFAULT_CONFIG, fixedRandom(0.5), gameTime);
            expect(newState.stateStartTime).toBe(gameTime);
            expect(newState.lastWaveSpawnTime).toBe(gameTime);
            expect(newState.wavesSpawned).toBe(0);
            // Derived timers should be 0
            const derived = computeDerivedTimers(newState, gameTime);
            expect(derived.setTimer).toBe(0);
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
                lastWaveSpawnTime: 0,
                nextWaveTime: 15,
                wavesSpawned: 0,
                currentSetWaves: 5,
            };
            const gameTime = sec(5); // Only 5 seconds passed
            expect(shouldSpawnWave(state, gameTime)).toBe(false);
        });

        it('should return true when time has elapsed and waves remain', () => {
            const state = {
                lastWaveSpawnTime: 0,
                nextWaveTime: 15,
                wavesSpawned: 0,
                currentSetWaves: 5,
            };
            const gameTime = sec(15); // 15 seconds passed
            expect(shouldSpawnWave(state, gameTime)).toBe(true);
        });

        it('should return false when all waves spawned', () => {
            const state = {
                lastWaveSpawnTime: 0,
                nextWaveTime: 15,
                wavesSpawned: 5,
                currentSetWaves: 5,
            };
            const gameTime = sec(20); // Time passed but all spawned
            expect(shouldSpawnWave(state, gameTime)).toBe(false);
        });
    });

    describe('recordWaveSpawned', () => {
        it('should increment wavesSpawned', () => {
            const state = { wavesSpawned: 2, lastWaveSpawnTime: 0 };
            const gameTime = sec(15);
            const newState = recordWaveSpawned(state, DEFAULT_CONFIG, fixedRandom(0.5), gameTime);
            expect(newState.wavesSpawned).toBe(3);
        });

        it('should set lastWaveSpawnTime to current gameTime', () => {
            const gameTime = sec(15);
            const state = { wavesSpawned: 2, lastWaveSpawnTime: 0 };
            const newState = recordWaveSpawned(state, DEFAULT_CONFIG, fixedRandom(0.5), gameTime);
            expect(newState.lastWaveSpawnTime).toBe(gameTime);
            // Derived timer should be 0 at spawn time
            const derived = computeDerivedTimers(newState, gameTime);
            expect(derived.timeSinceLastWave).toBe(0);
        });

        it('should set a new nextWaveTime', () => {
            const state = { wavesSpawned: 2, nextWaveTime: 15, lastWaveSpawnTime: 0 };
            const gameTime = sec(15);
            const newState = recordWaveSpawned(state, DEFAULT_CONFIG, fixedRandom(0.3), gameTime);
            // New time should be recalculated
            expect(newState.nextWaveTime).toBeDefined();
        });
    });

    describe('updateSetLullState', () => {
        describe('timer computation', () => {
            it('should compute setTimer from absolute timestamps', () => {
                const startTime = sec(10);
                const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                const currentTime = sec(11); // 1 second later
                const { state: newState } = updateSetLullState(state, currentTime, DEFAULT_CONFIG, fixedRandom(0.5));
                const derived = computeDerivedTimers(newState, currentTime);
                expect(derived.setTimer).toBe(1.0);
            });

            it('should compute timeSinceLastWave from absolute timestamps', () => {
                const startTime = sec(10);
                const state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                const currentTime = sec(11); // 1 second later
                const { state: newState } = updateSetLullState(state, currentTime, DEFAULT_CONFIG, fixedRandom(0.5));
                const derived = computeDerivedTimers(newState, currentTime);
                expect(derived.timeSinceLastWave).toBe(1.0);
            });

            it('should correctly compute time over multiple updates', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                // Simulate three 1-second updates (gameTime advances each call)
                state = updateSetLullState(state, sec(1), DEFAULT_CONFIG, fixedRandom(0.5)).state;
                state = updateSetLullState(state, sec(2), DEFAULT_CONFIG, fixedRandom(0.5)).state;
                state = updateSetLullState(state, sec(3), DEFAULT_CONFIG, fixedRandom(0.5)).state;
                const derived = computeDerivedTimers(state, sec(3));
                expect(derived.setTimer).toBe(3.0);
            });
        });

        describe('LULL state behavior', () => {
            it('should stay in LULL until duration elapses', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                // Initial lull duration is ~30s, advance only 10s
                state = updateSetLullState(state, sec(10), DEFAULT_CONFIG, fixedRandom(0.5)).state;
                expect(state.setState).toBe(STATE.LULL);
            });

            it('should transition to SET after lull duration', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                // Advance past lull duration (30s)
                state = updateSetLullState(state, sec(31), DEFAULT_CONFIG, fixedRandom(0.5)).state;
                expect(state.setState).toBe(STATE.SET);
            });

            it('should NOT spawn waves during lull (lulls are empty)', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                // Even with enough time elapsed, lulls should not spawn waves
                // (Background waves are handled separately, not by this state machine)
                const result = updateSetLullState(state, sec(16), DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(false);
                expect(result.amplitude).toBe(0);
            });

            it('should advance setTimer during LULL state', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);

                const result = updateSetLullState(state, sec(5), DEFAULT_CONFIG, fixedRandom(0.5));
                const derived = computeDerivedTimers(result.state, sec(5));
                expect(derived.setTimer).toBe(5.0);
            });
        });

        describe('SET state behavior', () => {
            it('should spawn waves with envelope amplitude', () => {
                // Create state already in SET at time 0
                const startTime = sec(0);
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                // Advance to spawn first wave (16 seconds later)
                const gameTime = sec(16);

                const result = updateSetLullState(state, gameTime, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(true);
                // First wave (progress=0) should have minAmplitude
                expect(result.amplitude).toBe(DEFAULT_CONFIG.minAmplitude);
            });

            it('should transition to LULL after all waves spawned', () => {
                // Create state already in SET with all waves spawned
                const startTime = sec(0);
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                state.wavesSpawned = state.currentSetWaves;

                const result = updateSetLullState(state, sec(1), DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setState).toBe(STATE.LULL);
            });

            it('should remain in SET while waves still pending', () => {
                // Create state already in SET with some waves spawned
                const startTime = sec(0);
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                state.wavesSpawned = 2; // Only 2 of 6 waves spawned

                // Advance time but not enough to spawn next wave
                const result = updateSetLullState(state, sec(1), DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setState).toBe(STATE.SET);
            });

            it('should advance setTimer during SET state', () => {
                const startTime = sec(0);
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5), startTime);

                const gameTime = sec(5);
                const result = updateSetLullState(state, gameTime, DEFAULT_CONFIG, fixedRandom(0.5));
                const derived = computeDerivedTimers(result.state, gameTime);
                expect(derived.setTimer).toBe(5.0);
            });
        });

        describe('wave spawning logic', () => {
            it('should not spawn when time has not elapsed', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                const result = updateSetLullState(state, sec(1), DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(false);
            });

            it('should set lastWaveSpawnTime after spawning', () => {
                // Start in SET state (lulls no longer spawn waves)
                const startTime = sec(0);
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                const spawnTime = sec(16); // Ready to spawn
                const result = updateSetLullState(state, spawnTime, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(true);
                expect(result.state.lastWaveSpawnTime).toBe(spawnTime);
                // Derived timer should be 0 at spawn time
                const derived = computeDerivedTimers(result.state, spawnTime);
                expect(derived.timeSinceLastWave).toBe(0);
            });

            it('should increment wavesSpawned after spawning', () => {
                // Start in SET state (lulls no longer spawn waves)
                const startTime = sec(0);
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                const initialSpawned = state.wavesSpawned;
                const spawnTime = sec(16); // Ready to spawn
                const result = updateSetLullState(state, spawnTime, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.wavesSpawned).toBe(initialSpawned + 1);
            });
        });

        describe('lull behavior', () => {
            it('should not reset wave counts during lull (no mini-sets)', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                const initialWavesSpawned = state.wavesSpawned;
                const initialSetWaves = state.currentSetWaves;

                // Advance time but not enough for state transition
                const result = updateSetLullState(state, sec(1), DEFAULT_CONFIG, fixedRandom(0.5));

                // Lulls no longer spawn waves or cycle mini-sets
                // Wave counts should remain unchanged until SET transition
                expect(result.state.wavesSpawned).toBe(initialWavesSpawned);
                expect(result.state.currentSetWaves).toBe(initialSetWaves);
            });
        });
    });

    describe('full cycle simulation', () => {
        it('should complete LULL → SET → LULL cycle', () => {
            const startTime = sec(0);
            let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
            expect(state.setState).toBe(STATE.LULL);

            // Advance through lull (30s) - simulate 1 second per iteration
            let gameTime = startTime;
            for (let t = 0; t < 35; t++) {
                gameTime += sec(1);
                const result = updateSetLullState(state, gameTime, DEFAULT_CONFIG, fixedRandom(0.5));
                state = result.state;
            }
            expect(state.setState).toBe(STATE.SET);

            // Advance through set - need to spawn all waves
            // Each wave takes ~15s to spawn, set has 6 waves
            for (let t = 0; t < 100; t++) {
                gameTime += sec(1);
                const result = updateSetLullState(state, gameTime, DEFAULT_CONFIG, fixedRandom(0.5));
                state = result.state;
                if (state.setState === STATE.LULL) break;
            }
            expect(state.setState).toBe(STATE.LULL);
        });

        it('should spawn multiple waves over simulation', () => {
            const startTime = sec(0);
            let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
            let totalSpawns = 0;
            let gameTime = startTime;

            // Simulate 2 minutes
            for (let t = 0; t < 120; t++) {
                gameTime += sec(1);
                const result = updateSetLullState(state, gameTime, DEFAULT_CONFIG, fixedRandom(0.5));
                state = result.state;
                if (result.shouldSpawn) totalSpawns++;
            }

            // Should have spawned several waves in 2 minutes
            expect(totalSpawns).toBeGreaterThan(5);
        });

        it('should reset stateStartTime when transitioning LULL → SET', () => {
            const startTime = sec(0);
            let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
            // Advance past lull duration (30s)
            const transitionTime = sec(31);
            state = updateSetLullState(state, transitionTime, DEFAULT_CONFIG, fixedRandom(0.5)).state;
            expect(state.setState).toBe(STATE.SET);
            expect(state.stateStartTime).toBe(transitionTime);
            // Derived timer should be 0 at transition
            const derived = computeDerivedTimers(state, transitionTime);
            expect(derived.setTimer).toBe(0);
        });

        it('should reset stateStartTime when transitioning SET → LULL', () => {
            // Create state already in SET with all waves spawned
            const startTime = sec(0);
            let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5), startTime);
            state.wavesSpawned = state.currentSetWaves;

            const transitionTime = sec(50);
            const result = updateSetLullState(state, transitionTime, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(result.state.setState).toBe(STATE.LULL);
            expect(result.state.stateStartTime).toBe(transitionTime);
            // Derived timer should be 0 at transition
            const derived = computeDerivedTimers(result.state, transitionTime);
            expect(derived.setTimer).toBe(0);
        });
    });

    describe('amplitude envelope progression', () => {
        it('should follow bell curve through entire set', () => {
            // Create a set with exactly 5 waves
            const config = { ...DEFAULT_CONFIG, wavesPerSet: [5, 5] };
            const startTime = sec(0);
            let state = initializeSet({}, config, fixedRandom(0.5), startTime);
            const amplitudes = [];
            let gameTime = startTime;

            // Spawn all 5 waves (each wave needs ~16 seconds)
            for (let i = 0; i < 5; i++) {
                gameTime += sec(16); // Advance past spawn threshold
                const result = updateSetLullState(state, gameTime, config, fixedRandom(0.5));
                if (result.shouldSpawn) {
                    amplitudes.push(result.amplitude);
                }
                state = result.state;
            }

            expect(amplitudes.length).toBe(5);
            // First wave should be at minAmplitude (progress = 0)
            expect(amplitudes[0]).toBeCloseTo(DEFAULT_CONFIG.minAmplitude, 5);
            // Middle waves should be higher
            expect(amplitudes[1]).toBeGreaterThan(amplitudes[0]);
            // Peak should be higher than first and last
            const peakIdx = 1; // At 40% through 5 waves (index ~1-2)
            expect(amplitudes[peakIdx]).toBeGreaterThan(amplitudes[0]);
            // Last wave should be back to low amplitude
            expect(amplitudes[4]).toBeCloseTo(DEFAULT_CONFIG.minAmplitude, 5);
        });

        it('should have peak amplitude at configured position', () => {
            // With 5 waves, wave at index 2 (progress=0.5) is close to peak at 0.4
            const progress = DEFAULT_CONFIG.peakPosition;
            const amp = calculateSetAmplitude(progress, DEFAULT_CONFIG);
            expect(amp).toBe(1.0);
        });
    });

    describe('wave count bounds', () => {
        it('should generate set waves within configured range', () => {
            // Test with specific random values (Math.random returns [0, 1), never exactly 1)
            const testValues = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999];
            for (const r of testValues) {
                const state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(r));
                expect(state.currentSetWaves).toBeGreaterThanOrEqual(DEFAULT_CONFIG.wavesPerSet[0]);
                expect(state.currentSetWaves).toBeLessThanOrEqual(DEFAULT_CONFIG.wavesPerSet[1]);
            }
        });

        it('should generate lull waves within configured range', () => {
            // Test with specific random values (Math.random returns [0, 1), never exactly 1)
            const testValues = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999];
            for (const r of testValues) {
                const state = initializeLull({}, DEFAULT_CONFIG, fixedRandom(r));
                expect(state.currentSetWaves).toBeGreaterThanOrEqual(DEFAULT_CONFIG.lullWavesPerSet[0]);
                expect(state.currentSetWaves).toBeLessThanOrEqual(DEFAULT_CONFIG.lullWavesPerSet[1]);
            }
        });

        it('should handle minimum wave count (4)', () => {
            const config = { ...DEFAULT_CONFIG, wavesPerSet: [4, 4] };
            const state = initializeSet({}, config, fixedRandom(0.5));
            expect(state.currentSetWaves).toBe(4);
        });

        it('should handle maximum wave count (8)', () => {
            // Random = 1 should give max - need to account for floor
            const config = { ...DEFAULT_CONFIG, wavesPerSet: [8, 8] };
            const state = initializeSet({}, config, fixedRandom(0.5));
            expect(state.currentSetWaves).toBe(8);
        });
    });

    describe('spawn timing variation', () => {
        it('should spawn at base period when random is 0.5', () => {
            const state = {
                lastWaveSpawnTime: 0,
                nextWaveTime: DEFAULT_CONFIG.swellPeriod,
                wavesSpawned: 0,
                currentSetWaves: 5,
            };
            const gameTime = sec(DEFAULT_CONFIG.swellPeriod);
            expect(shouldSpawnWave(state, gameTime)).toBe(true);
        });

        it('should spawn earlier with random < 0.5', () => {
            const minTime = getNextWaveTime(DEFAULT_CONFIG, fixedRandom(0));
            expect(minTime).toBe(DEFAULT_CONFIG.swellPeriod - DEFAULT_CONFIG.periodVariation);
        });

        it('should spawn later with random > 0.5', () => {
            const maxTime = getNextWaveTime(DEFAULT_CONFIG, fixedRandom(1));
            expect(maxTime).toBe(DEFAULT_CONFIG.swellPeriod + DEFAULT_CONFIG.periodVariation);
        });
    });

    describe('Edge Cases', () => {
        describe('Timing Edge Cases', () => {
            it('handles same gameTime without breaking updates', () => {
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);

                // Update with same time (no change)
                const result = updateSetLullState(state, startTime, DEFAULT_CONFIG, fixedRandom(0.5));
                const derived = computeDerivedTimers(result.state, startTime);
                expect(derived.setTimer).toBe(0);
                expect(result.shouldSpawn).toBe(false);
            });

            it('handles very large time jump (simulates lag spike handling)', () => {
                // Note: main.js clamps deltaTime, but setLullModel should handle any value
                const startTime = sec(0);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);
                const result = updateSetLullState(state, sec(1000), DEFAULT_CONFIG, fixedRandom(0.5));

                // Should transition through states without crashing
                expect(result.state).toBeDefined();
                expect([STATE.LULL, STATE.SET]).toContain(result.state.setState);
            });

            it('handles gameTime going backwards gracefully (edge case)', () => {
                const startTime = sec(10);
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5), startTime);

                // Time going backwards (unusual but possible with save/load bugs)
                const result = updateSetLullState(state, sec(5), DEFAULT_CONFIG, fixedRandom(0.5));
                const derived = computeDerivedTimers(result.state, sec(5));
                // With absolute time, derived timer will be negative
                expect(derived.setTimer).toBe(-5);
            });
        });

        describe('State Edge Cases', () => {
            it('handles rapid state transitions', () => {
                // Create a config with very short durations
                const fastConfig = {
                    ...DEFAULT_CONFIG,
                    lullDuration: 0.1,
                    lullVariation: 0,
                    swellPeriod: 0.1,
                    periodVariation: 0,
                    wavesPerSet: [1, 1],
                    lullWavesPerSet: [1, 1],
                };

                const startTime = sec(0);
                let state = createInitialState(fastConfig, fixedRandom(0.5), startTime);
                let transitions = 0;
                let lastState = state.setState;
                let gameTime = startTime;

                // Rapid updates (0.2 second increments)
                for (let i = 0; i < 100; i++) {
                    gameTime += sec(0.2);
                    const result = updateSetLullState(state, gameTime, fastConfig, fixedRandom(0.5));
                    state = result.state;
                    if (state.setState !== lastState) {
                        transitions++;
                        lastState = state.setState;
                    }
                }

                // Should have multiple transitions without crashing
                expect(transitions).toBeGreaterThan(5);
            });

            it('handles single-wave sets correctly', () => {
                const singleWaveConfig = {
                    ...DEFAULT_CONFIG,
                    wavesPerSet: [1, 1],
                };

                const startTime = sec(0);
                let state = initializeSet({}, singleWaveConfig, fixedRandom(0.5), startTime);
                expect(state.currentSetWaves).toBe(1);

                // Progress calculation for single wave set (avoid division by zero)
                const spawnTime = sec(16);
                const result = updateSetLullState(state, spawnTime, singleWaveConfig, fixedRandom(0.5));

                // Should spawn with amplitude at peak position
                expect(result.shouldSpawn).toBe(true);
                expect(result.amplitude).toBe(calculateSetAmplitude(singleWaveConfig.peakPosition, singleWaveConfig));
            });

            it('handles empty config gracefully by using defaults', () => {
                // updateSetLullState should use DEFAULT_CONFIG if not provided
                let state = createInitialState();
                const result = updateSetLullState(state, sec(1));
                expect(result.state).toBeDefined();
            });
        });

        describe('Amplitude Edge Cases', () => {
            it('handles extreme peakPosition of 0 (peak at start)', () => {
                const config = { ...DEFAULT_CONFIG, peakPosition: 0 };
                // When peakPosition=0, progress 0 is exactly at peak
                // The building phase (progress < peak) is skipped, so it uses fading formula
                // At progress 0, t = (0 - 0) / (1 - 0) = 0, so amplitude = 1.0
                const amp = calculateSetAmplitude(0, config);
                expect(amp).toBe(1.0);
            });

            it('handles peakPosition of 1 (peak at end) causes NaN', () => {
                const config = { ...DEFAULT_CONFIG, peakPosition: 1 };
                // When peakPosition=1, fading phase has division by zero: (1-1)=0
                // This is an edge case that produces NaN - documenting current behavior
                const amp = calculateSetAmplitude(1, config);
                expect(amp).toBeNaN();
            });

            it('handles minAmplitude of 0', () => {
                const config = { ...DEFAULT_CONFIG, minAmplitude: 0 };
                const ampStart = calculateSetAmplitude(0, config);
                const ampPeak = calculateSetAmplitude(config.peakPosition, config);
                expect(ampStart).toBe(0);
                expect(ampPeak).toBe(1.0);
            });

            it('handles minAmplitude of 1 (all waves same amplitude)', () => {
                const config = { ...DEFAULT_CONFIG, minAmplitude: 1 };
                const ampStart = calculateSetAmplitude(0, config);
                const ampMid = calculateSetAmplitude(0.5, config);
                const ampEnd = calculateSetAmplitude(1, config);
                expect(ampStart).toBe(1);
                expect(ampMid).toBe(1);
                expect(ampEnd).toBe(1);
            });
        });
    });
});
