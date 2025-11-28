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

            it('should NOT spawn waves during lull (lulls are empty)', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                // Even with enough time elapsed, lulls should not spawn waves
                // (Background waves are handled separately, not by this state machine)
                const result = updateSetLullState(state, 16.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(false);
                expect(result.amplitude).toBe(0);
            });

            it('should advance setTimer during LULL state', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const initialTimer = state.setTimer;

                const result = updateSetLullState(state, 5.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setTimer).toBe(initialTimer + 5.0);
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

            it('should remain in SET while waves still pending', () => {
                // Create state already in SET with some waves spawned
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
                state.wavesSpawned = 2; // Only 2 of 6 waves spawned

                // Advance time but not enough to spawn next wave
                const result = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setState).toBe(STATE.SET);
            });

            it('should advance setTimer during SET state', () => {
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
                const initialTimer = state.setTimer;

                const result = updateSetLullState(state, 5.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setTimer).toBe(initialTimer + 5.0);
            });
        });

        describe('wave spawning logic', () => {
            it('should not spawn when time has not elapsed', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const result = updateSetLullState(state, 1.0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(false);
            });

            it('should reset timeSinceLastWave after spawning', () => {
                // Start in SET state (lulls no longer spawn waves)
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
                state.timeSinceLastWave = 16; // Ready to spawn
                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.shouldSpawn).toBe(true);
                expect(result.state.timeSinceLastWave).toBe(0);
            });

            it('should increment wavesSpawned after spawning', () => {
                // Start in SET state (lulls no longer spawn waves)
                let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
                const initialSpawned = state.wavesSpawned;
                state.timeSinceLastWave = 16; // Ready to spawn
                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.wavesSpawned).toBe(initialSpawned + 1);
            });
        });

        describe('lull behavior', () => {
            it('should not reset wave counts during lull (no mini-sets)', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const initialWavesSpawned = state.wavesSpawned;
                const initialSetWaves = state.currentSetWaves;

                // Advance time but not enough for state transition
                const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));

                // Lulls no longer spawn waves or cycle mini-sets
                // Wave counts should remain unchanged until SET transition
                expect(result.state.wavesSpawned).toBe(initialWavesSpawned);
                expect(result.state.currentSetWaves).toBe(initialSetWaves);
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

        it('should reset setTimer when transitioning LULL → SET', () => {
            let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
            // Advance past lull duration (30s)
            state = updateSetLullState(state, 31.0, DEFAULT_CONFIG, fixedRandom(0.5)).state;
            expect(state.setState).toBe(STATE.SET);
            expect(state.setTimer).toBe(0);
        });

        it('should reset setTimer when transitioning SET → LULL', () => {
            // Create state already in SET with all waves spawned
            let state = initializeSet({}, DEFAULT_CONFIG, fixedRandom(0.5));
            state.wavesSpawned = state.currentSetWaves;
            state.setTimer = 50.0; // Simulate time passed

            const result = updateSetLullState(state, 0.1, DEFAULT_CONFIG, fixedRandom(0.5));
            expect(result.state.setState).toBe(STATE.LULL);
            expect(result.state.setTimer).toBe(0);
        });
    });

    describe('amplitude envelope progression', () => {
        it('should follow bell curve through entire set', () => {
            // Create a set with exactly 5 waves
            const config = { ...DEFAULT_CONFIG, wavesPerSet: [5, 5] };
            let state = initializeSet({}, config, fixedRandom(0.5));
            const amplitudes = [];

            // Spawn all 5 waves
            for (let i = 0; i < 5; i++) {
                state.timeSinceLastWave = 16; // Ready to spawn
                const result = updateSetLullState(state, 0.1, config, fixedRandom(0.5));
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
                timeSinceLastWave: DEFAULT_CONFIG.swellPeriod,
                nextWaveTime: DEFAULT_CONFIG.swellPeriod,
                wavesSpawned: 0,
                currentSetWaves: 5,
            };
            expect(shouldSpawnWave(state)).toBe(true);
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
            it('handles zero deltaTime without breaking updates', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const initialTimer = state.setTimer;

                const result = updateSetLullState(state, 0, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setTimer).toBe(initialTimer);
                expect(result.shouldSpawn).toBe(false);
            });

            it('handles very large deltaTime (simulates lag spike handling)', () => {
                // Note: main.js clamps deltaTime, but setLullModel should handle any value
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const result = updateSetLullState(state, 1000, DEFAULT_CONFIG, fixedRandom(0.5));

                // Should transition through states without crashing
                expect(result.state).toBeDefined();
                expect([STATE.LULL, STATE.SET]).toContain(result.state.setState);
            });

            it('handles negative deltaTime gracefully (edge case)', () => {
                let state = createInitialState(DEFAULT_CONFIG, fixedRandom(0.5));
                const initialTimer = state.setTimer;

                // Negative time would make timer go negative
                const result = updateSetLullState(state, -1, DEFAULT_CONFIG, fixedRandom(0.5));
                expect(result.state.setTimer).toBe(initialTimer - 1);
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

                let state = createInitialState(fastConfig, fixedRandom(0.5));
                let transitions = 0;
                let lastState = state.setState;

                // Rapid updates
                for (let i = 0; i < 100; i++) {
                    const result = updateSetLullState(state, 0.2, fastConfig, fixedRandom(0.5));
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

                let state = initializeSet({}, singleWaveConfig, fixedRandom(0.5));
                expect(state.currentSetWaves).toBe(1);

                // Progress calculation for single wave set (avoid division by zero)
                state.timeSinceLastWave = 16;
                const result = updateSetLullState(state, 0.1, singleWaveConfig, fixedRandom(0.5));

                // Should spawn with amplitude at peak position
                expect(result.shouldSpawn).toBe(true);
                expect(result.amplitude).toBe(calculateSetAmplitude(singleWaveConfig.peakPosition, singleWaveConfig));
            });

            it('handles empty config gracefully by using defaults', () => {
                // updateSetLullState should use DEFAULT_CONFIG if not provided
                let state = createInitialState();
                const result = updateSetLullState(state, 1.0);
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
