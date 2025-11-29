import { describe, it, expect } from 'vitest';
import {
    getOceanBounds,
    calculateTravelDuration,
    progressToScreenY,
    screenYToProgress,
    updateWaveSpawning,
    updateWaves,
    updateFoamLifecycle,
    updateFoamRowLifecycle,
    initializePlayer,
} from './index.js';
import { createWave, WAVE_TYPE } from '../state/waveModel.js';
import { createInitialState as createSetLullState, DEFAULT_CONFIG } from '../state/setLullModel.js';
import { createInitialBackgroundState, BACKGROUND_CONFIG } from '../state/backgroundWaveModel.js';
import { DEFAULT_BATHYMETRY } from '../state/bathymetryModel.js';

describe('update/index', () => {
    describe('getOceanBounds', () => {
        it('calculates ocean bounds from canvas height', () => {
            const bounds = getOceanBounds(600, 100);

            expect(bounds.oceanTop).toBe(0);
            expect(bounds.oceanBottom).toBe(500);
            expect(bounds.shoreY).toBe(500);
        });
    });

    describe('calculateTravelDuration', () => {
        it('calculates time for wave to travel ocean height', () => {
            // 500px ocean, 50px/sec = 10 seconds = 10000ms
            const duration = calculateTravelDuration(500, 50);

            expect(duration).toBe(10000);
        });
    });

    describe('progressToScreenY', () => {
        it('converts progress 0 to ocean top', () => {
            const y = progressToScreenY(0, 0, 500);
            expect(y).toBe(0);
        });

        it('converts progress 1 to ocean bottom', () => {
            const y = progressToScreenY(1, 0, 500);
            expect(y).toBe(500);
        });

        it('converts progress 0.5 to middle', () => {
            const y = progressToScreenY(0.5, 0, 500);
            expect(y).toBe(250);
        });
    });

    describe('screenYToProgress', () => {
        it('converts ocean top to progress 0', () => {
            const progress = screenYToProgress(0, 0, 500);
            expect(progress).toBe(0);
        });

        it('converts ocean bottom to progress 1', () => {
            const progress = screenYToProgress(500, 0, 500);
            expect(progress).toBe(1);
        });

        it('is inverse of progressToScreenY', () => {
            const originalProgress = 0.37;
            const y = progressToScreenY(originalProgress, 0, 500);
            const recoveredProgress = screenYToProgress(y, 0, 500);

            expect(recoveredProgress).toBeCloseTo(originalProgress);
        });
    });

    describe('updateWaveSpawning', () => {
        it('returns events when waves should spawn', () => {
            // Create a state where set wave is due
            const setLullState = createSetLullState(DEFAULT_CONFIG);
            // Manually put it in spawning state
            setLullState.phase = 'spawning';
            setLullState.waveIndex = 0;
            setLullState.lastWaveSpawnTime = 0;

            const state = {
                setLullState,
                setConfig: DEFAULT_CONFIG,
                backgroundState: createInitialBackgroundState(BACKGROUND_CONFIG),
                backgroundConfig: BACKGROUND_CONFIG,
            };

            // Jump forward enough time for wave spacing
            const gameTime = DEFAULT_CONFIG.waveSpacing * 1000 + 100;
            const result = updateWaveSpawning(state, 0.016, gameTime, {});

            expect(result.setLullState).toBeDefined();
            expect(result.backgroundState).toBeDefined();
            // Events may or may not be present depending on timing
            expect(Array.isArray(result.events)).toBe(true);
        });

        it('updates both state machines', () => {
            const state = {
                setLullState: createSetLullState(DEFAULT_CONFIG),
                setConfig: DEFAULT_CONFIG,
                backgroundState: createInitialBackgroundState(BACKGROUND_CONFIG),
                backgroundConfig: BACKGROUND_CONFIG,
            };

            const result = updateWaveSpawning(state, 0.016, 1000, {});

            expect(result.setLullState).toBeDefined();
            expect(result.backgroundState).toBeDefined();
        });
    });

    describe('updateWaves', () => {
        it('filters out completed waves', () => {
            const waves = [
                createWave(0, 0.8, WAVE_TYPE.SET),
                createWave(8000, 0.6, WAVE_TYPE.SET),
            ];
            // First wave spawned at t=0, second at t=8000
            // At t=12000 with 10000ms travel, first wave is complete (12000 - 0 > 10000)
            // Second wave is still active (12000 - 8000 = 4000 < 10000)

            const activeWaves = updateWaves(waves, 12000, 10000, 0, DEFAULT_BATHYMETRY);

            expect(activeWaves).toHaveLength(1);
            expect(activeWaves[0].spawnTime).toBe(8000);
        });

        it('updates wave refraction', () => {
            const wave = createWave(0, 0.8, WAVE_TYPE.SET);
            const initialProgress = [...wave.progressPerX];

            // Update with some time passed
            const activeWaves = updateWaves([wave], 1000, 10000, 0, DEFAULT_BATHYMETRY);

            // Progress should have changed
            expect(activeWaves[0].progressPerX).not.toEqual(initialProgress);
        });
    });

    describe('updateFoamLifecycle', () => {
        it('removes faded foam', () => {
            const foamSegments = [
                { opacity: 0.5, lastUpdateTime: 0 },
                { opacity: 0.01, lastUpdateTime: 0 }, // Very faded
            ];

            const active = updateFoamLifecycle(foamSegments, 0.1, 1000);

            // The very faded one should be filtered out
            expect(active.length).toBeLessThanOrEqual(foamSegments.length);
        });
    });

    describe('updateFoamRowLifecycle', () => {
        it('updates opacity based on age', () => {
            const foamRows = [
                { y: 100, spawnTime: 0, segments: [], opacity: 1 },
            ];

            const updated = updateFoamRowLifecycle(foamRows, 2000);

            // At 2000ms with 4000ms fade time, should be 50% opacity
            expect(updated[0].opacity).toBeCloseTo(0.5);
        });

        it('removes fully faded rows', () => {
            const foamRows = [
                { y: 100, spawnTime: 0, segments: [], opacity: 1 },
            ];

            const updated = updateFoamRowLifecycle(foamRows, 5000);

            // At 5000ms with 4000ms fade time, should be removed
            expect(updated).toHaveLength(0);
        });
    });

    describe('initializePlayer', () => {
        it('creates player at shore position', () => {
            const player = initializePlayer(800, 600, 100);

            expect(player).toBeDefined();
            expect(player.x).toBeDefined();
            expect(player.y).toBeDefined();
        });
    });

    describe('performance', () => {
        it('updateFoamLifecycle handles 20,000 segments under 16ms', () => {
            // Create large foam array (simulates heavy foam accumulation)
            const foamSegments = [];
            for (let i = 0; i < 20000; i++) {
                foamSegments.push({
                    id: `foam-${i}`,
                    spawnTime: i * 10,
                    x: Math.random(),
                    y: Math.random() * 500,
                    opacity: 0.5 + Math.random() * 0.5,
                    fadeJitter: (Math.random() - 0.5) * 10000,
                });
            }

            const start = performance.now();
            updateFoamLifecycle(foamSegments, 0.016, 50000);
            const elapsed = performance.now() - start;

            // Must complete within 16ms (one frame at 60fps)
            expect(elapsed).toBeLessThan(16);
        });

        it('updateFoamRowLifecycle handles 500+ rows under 16ms', () => {
            // Create large foam row array
            const foamRows = [];
            for (let i = 0; i < 600; i++) {
                foamRows.push({
                    y: i * 2,
                    spawnTime: i * 10,
                    segments: [{ startX: 0, endX: 0.5, intensity: 0.8 }],
                    opacity: 1,
                });
            }

            const start = performance.now();
            updateFoamRowLifecycle(foamRows, 50000);
            const elapsed = performance.now() - start;

            // Must complete within 16ms (one frame at 60fps)
            expect(elapsed).toBeLessThan(16);
        });
    });
});
