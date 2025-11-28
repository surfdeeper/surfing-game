import { describe, it, expect, beforeEach } from 'vitest';
import {
    createWave,
    resetWaveIdCounter,
    getWaveProgress,
    isWaveComplete,
    getActiveWaves,
    WAVE_TYPE,
    amplitudeToHeight,
    isWaveBreaking,
    updateWaveRefraction,
    getAverageProgress,
    getProgressAtX,
    WAVE_X_SAMPLES,
    REFRACTION_STRENGTH,
    LATERAL_DIFFUSION,
} from './waveModel.js';

// Helper to calculate variance of an array
function calculateVariance(arr) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squaredDiffs = arr.map(x => (x - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
}

describe('waveModel', () => {
    beforeEach(() => {
        resetWaveIdCounter();
    });

    describe('createWave', () => {
        it('creates wave with correct properties', () => {
            const wave = createWave(1000, 0.8);
            expect(wave.id).toBe('wave-1');
            expect(wave.spawnTime).toBe(1000);
            expect(wave.amplitude).toBe(0.8);
        });

        it('increments wave ID for each new wave', () => {
            const wave1 = createWave(1000, 0.5);
            const wave2 = createWave(2000, 0.6);
            expect(wave1.id).toBe('wave-1');
            expect(wave2.id).toBe('wave-2');
        });

        it('defaults to SET wave type', () => {
            const wave = createWave(1000, 0.8);
            expect(wave.type).toBe(WAVE_TYPE.SET);
        });

        it('accepts BACKGROUND wave type', () => {
            const wave = createWave(1000, 0.2, WAVE_TYPE.BACKGROUND);
            expect(wave.type).toBe(WAVE_TYPE.BACKGROUND);
        });

        it('accepts SET wave type explicitly', () => {
            const wave = createWave(1000, 0.8, WAVE_TYPE.SET);
            expect(wave.type).toBe(WAVE_TYPE.SET);
        });
    });

    describe('getWaveProgress', () => {
        it('wave at spawn time has progress 0', () => {
            const wave = createWave(1000, 0.8);
            const progress = getWaveProgress(wave, 1000, 5000);
            expect(progress).toBe(0);
        });

        it('wave at half travel time has progress 0.5', () => {
            const wave = createWave(1000, 0.8);
            const progress = getWaveProgress(wave, 3500, 5000);
            expect(progress).toBe(0.5);
        });

        it('wave at full travel time has progress 1', () => {
            const wave = createWave(1000, 0.8);
            const progress = getWaveProgress(wave, 6000, 5000);
            expect(progress).toBe(1);
        });

        it('wave past travel time is clamped to 1', () => {
            const wave = createWave(1000, 0.8);
            const progress = getWaveProgress(wave, 10000, 5000);
            expect(progress).toBe(1);
        });

        it('wave before spawn time is clamped to 0', () => {
            const wave = createWave(1000, 0.8);
            const progress = getWaveProgress(wave, 500, 5000);
            expect(progress).toBe(0);
        });

        it('handles different travel durations', () => {
            const wave = createWave(0, 1.0);
            // 2000ms elapsed, 10000ms duration = 20% progress
            expect(getWaveProgress(wave, 2000, 10000)).toBeCloseTo(0.2);
            // 2000ms elapsed, 4000ms duration = 50% progress
            expect(getWaveProgress(wave, 2000, 4000)).toBeCloseTo(0.5);
        });
    });

    describe('isWaveComplete', () => {
        it('returns false for wave at horizon', () => {
            const wave = createWave(1000, 0.8);
            expect(isWaveComplete(wave, 1000, 5000)).toBe(false);
        });

        it('returns false for wave in transit', () => {
            const wave = createWave(1000, 0.8);
            expect(isWaveComplete(wave, 3000, 5000)).toBe(false);
        });

        it('returns true for wave at shore', () => {
            const wave = createWave(1000, 0.8);
            expect(isWaveComplete(wave, 6000, 5000)).toBe(true);
        });

        it('returns true for wave past shore', () => {
            const wave = createWave(1000, 0.8);
            expect(isWaveComplete(wave, 10000, 5000)).toBe(true);
        });
    });

    describe('getActiveWaves', () => {
        it('returns all waves when none are complete', () => {
            const waves = [
                createWave(1000, 0.5),
                createWave(2000, 0.6),
                createWave(3000, 0.7),
            ];
            const active = getActiveWaves(waves, 3000, 5000);
            expect(active).toHaveLength(3);
        });

        it('filters out completed waves', () => {
            const waves = [
                createWave(0, 0.5),      // complete at t=5000
                createWave(3000, 0.6),   // progress 0.4 at t=5000
                createWave(4000, 0.7),   // progress 0.2 at t=5000
            ];
            const active = getActiveWaves(waves, 5000, 5000);
            expect(active).toHaveLength(2);
            expect(active[0].id).toBe('wave-2');
            expect(active[1].id).toBe('wave-3');
        });

        it('returns empty array when all waves complete', () => {
            const waves = [
                createWave(0, 0.5),
                createWave(1000, 0.6),
            ];
            const active = getActiveWaves(waves, 10000, 5000);
            expect(active).toHaveLength(0);
        });

        it('returns empty array for empty input', () => {
            const active = getActiveWaves([], 5000, 5000);
            expect(active).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        describe('Wave Progress Edge Cases', () => {
            it('handles zero travel duration gracefully', () => {
                const wave = createWave(1000, 0.8);
                // Division by zero - should clamp to 1 (wave instantly at shore)
                const progress = getWaveProgress(wave, 1001, 0);
                // elapsed / 0 = Infinity, clamped to 1
                expect(progress).toBe(1);
            });

            it('handles very large time values', () => {
                const wave = createWave(0, 0.8);
                const progress = getWaveProgress(wave, 1e12, 5000);
                expect(progress).toBe(1);
            });

            it('handles concurrent waves at same spawn time', () => {
                const wave1 = createWave(1000, 0.5);
                const wave2 = createWave(1000, 0.8);
                const progress1 = getWaveProgress(wave1, 3500, 5000);
                const progress2 = getWaveProgress(wave2, 3500, 5000);
                expect(progress1).toBe(progress2);
            });
        });

        describe('State Edge Cases', () => {
            it('handles 100+ waves without issues', () => {
                const waves = [];
                for (let i = 0; i < 100; i++) {
                    waves.push(createWave(i * 100, 0.5));
                }
                // All waves should be created
                expect(waves).toHaveLength(100);
                // Filter should handle large array
                const active = getActiveWaves(waves, 5000, 5000);
                expect(active.length).toBeLessThanOrEqual(100);
            });

            it('handles waves with zero amplitude', () => {
                const wave = createWave(1000, 0);
                expect(wave.amplitude).toBe(0);
                // Progress should still work
                expect(getWaveProgress(wave, 3500, 5000)).toBe(0.5);
            });

            it('handles waves with amplitude > 1', () => {
                // Not strictly valid, but shouldn't crash
                const wave = createWave(1000, 1.5);
                expect(wave.amplitude).toBe(1.5);
            });
        });

        describe('Wave Breaking (Depth-Based)', () => {
            it('wave starts with lastFoamY = -1', () => {
                const wave = createWave(1000, 0.8);
                expect(wave.lastFoamY).toBe(-1);
            });

            it('amplitudeToHeight maps amplitude to wave height', () => {
                // Min amplitude (0) → 0.5m
                expect(amplitudeToHeight(0)).toBe(0.5);
                // Max amplitude (1) → 3m
                expect(amplitudeToHeight(1)).toBe(3.0);
                // Mid amplitude (0.5) → 1.75m
                expect(amplitudeToHeight(0.5)).toBe(1.75);
            });

            it('high amplitude wave breaks in shallow water', () => {
                const wave = createWave(1000, 1.0); // max amplitude → 3m height
                const depth = 2; // 2m depth
                // 3m > 0.78 * 2m (1.56m) → should break
                expect(isWaveBreaking(wave, depth)).toBe(true);
            });

            it('wave does not break in deep water', () => {
                const wave = createWave(1000, 1.0); // max amplitude → 3m height
                const depth = 20; // 20m depth
                // 3m < 0.78 * 20m (15.6m) → should not break
                expect(isWaveBreaking(wave, depth)).toBe(false);
            });

            it('low amplitude wave does not break even in shallow water', () => {
                const wave = createWave(1000, 0.2); // low amplitude → ~1m height
                const depth = 2; // 2m depth
                // 1m < 0.78 * 2m (1.56m) → should not break
                expect(isWaveBreaking(wave, depth)).toBe(false);
            });

            it('wave can break and reform multiple times', () => {
                // Wave breaks based purely on depth, no state tracking
                // Can break over sandbar, reform in deep water, break again at point
                const wave = createWave(1000, 1.0); // 3m height

                // Over sandbar (shallow) - breaking
                expect(isWaveBreaking(wave, 2)).toBe(true);
                // In deep water - not breaking (reformed)
                expect(isWaveBreaking(wave, 20)).toBe(false);
                // Over point (shallow again) - breaking again
                expect(isWaveBreaking(wave, 2)).toBe(true);
            });
        });

        describe('Timing Edge Cases', () => {
            it('handles zero deltaTime (no time passed)', () => {
                const wave = createWave(1000, 0.8);
                const progress = getWaveProgress(wave, 1000, 5000);
                expect(progress).toBe(0);
            });

            it('handles negative time (should clamp to 0)', () => {
                const wave = createWave(1000, 0.8);
                const progress = getWaveProgress(wave, -500, 5000);
                expect(progress).toBe(0);
            });

            it('handles float precision in progress calculation', () => {
                const wave = createWave(0, 0.8);
                // 1/3 of duration = should be very close to 0.333...
                const progress = getWaveProgress(wave, 1666.666, 5000);
                expect(progress).toBeCloseTo(0.333, 2);
            });
        });
    });

    describe('Wave Refraction (Per-X Progress)', () => {
        describe('createWave with progressPerX', () => {
            it('creates wave with progressPerX array', () => {
                const wave = createWave(1000, 0.8);
                expect(wave.progressPerX).toBeDefined();
                expect(wave.progressPerX).toHaveLength(WAVE_X_SAMPLES);
            });

            it('initializes all progressPerX values to 0', () => {
                const wave = createWave(1000, 0.8);
                for (const progress of wave.progressPerX) {
                    expect(progress).toBe(0);
                }
            });

            it('sets lastUpdateTime to spawnTime', () => {
                const wave = createWave(1000, 0.8);
                expect(wave.lastUpdateTime).toBe(1000);
            });
        });

        describe('updateWaveRefraction', () => {
            it('advances progress uniformly in constant depth', () => {
                const wave = createWave(0, 0.8);
                const constantDepth = () => 30; // Deep water everywhere

                updateWaveRefraction(wave, 1000, 10000, constantDepth, 30);

                // All X positions should have same progress (~0.1)
                const avgProgress = getAverageProgress(wave);
                expect(avgProgress).toBeCloseTo(0.1, 1);

                // All values should be nearly equal
                const min = Math.min(...wave.progressPerX);
                const max = Math.max(...wave.progressPerX);
                expect(max - min).toBeLessThan(0.01);
            });

            it('advances slower in shallow water', () => {
                const wave = createWave(0, 0.8);
                // Left side shallow (2m), right side deep (30m)
                const varyingDepth = (x) => x < 0.5 ? 2 : 30;

                updateWaveRefraction(wave, 2000, 10000, varyingDepth, 30);

                // Left (shallow) should have less progress than right (deep)
                const leftProgress = getProgressAtX(wave, 0.25);
                const rightProgress = getProgressAtX(wave, 0.75);
                expect(leftProgress).toBeLessThan(rightProgress);
            });

            it('creates bent wave line from bathymetry', () => {
                const wave = createWave(0, 0.8);
                // Sandbar in middle (shallow at x=0.5)
                const sandbarDepth = (x) => {
                    const distFromCenter = Math.abs(x - 0.5);
                    return distFromCenter < 0.2 ? 2 : 30; // Shallow in center
                };

                // Run several update cycles
                for (let t = 1000; t <= 5000; t += 1000) {
                    updateWaveRefraction(wave, t, 10000, sandbarDepth, 30);
                }

                // Center (shallow) should lag behind edges (deep)
                const leftProgress = getProgressAtX(wave, 0.1);
                const centerProgress = getProgressAtX(wave, 0.5);
                const rightProgress = getProgressAtX(wave, 0.9);

                expect(centerProgress).toBeLessThan(leftProgress);
                expect(centerProgress).toBeLessThan(rightProgress);
            });

            it('does not update if no time has passed', () => {
                const wave = createWave(1000, 0.8);
                const initialProgress = [...wave.progressPerX];

                updateWaveRefraction(wave, 1000, 10000, () => 30, 30);

                expect(wave.progressPerX).toEqual(initialProgress);
            });

            it('clamps progress to maximum of 1', () => {
                const wave = createWave(0, 0.8);

                // Very long time, wave should reach shore
                updateWaveRefraction(wave, 100000, 10000, () => 30, 30);

                for (const progress of wave.progressPerX) {
                    expect(progress).toBeLessThanOrEqual(1);
                }
            });

            it('uses progress for depth lookup (refraction compounds)', () => {
                const wave = createWave(0, 0.8);
                // Depth depends on progress (gets shallower near shore)
                const progressBasedDepth = (x, progress) => 30 - progress * 28; // 30m at horizon, 2m at shore

                // Multiple small updates
                for (let t = 500; t <= 2500; t += 500) {
                    updateWaveRefraction(wave, t, 10000, progressBasedDepth, 30);
                }

                // Wave should have slowed down as it got shallower
                const avgProgress = getAverageProgress(wave);
                // With REFRACTION_STRENGTH dampening, effect is subtle
                // Should still be slightly less than linear 0.25
                expect(avgProgress).toBeLessThan(0.25);
            });

            it('respects REFRACTION_STRENGTH dampening', () => {
                // REFRACTION_STRENGTH should be between 0 and 1
                expect(REFRACTION_STRENGTH).toBeGreaterThanOrEqual(0);
                expect(REFRACTION_STRENGTH).toBeLessThanOrEqual(1);
            });

            it('respects LATERAL_DIFFUSION setting', () => {
                // LATERAL_DIFFUSION should be between 0 and 1
                expect(LATERAL_DIFFUSION).toBeGreaterThanOrEqual(0);
                expect(LATERAL_DIFFUSION).toBeLessThanOrEqual(1);
            });
        });

        describe('lateral diffusion (wave reformation)', () => {
            it('reduces variance in progress values over time', () => {
                const wave = createWave(0, 0.8);
                // Manually create a bent wave (center lagging behind)
                const n = wave.progressPerX.length;
                for (let i = 0; i < n; i++) {
                    const distFromCenter = Math.abs(i - n / 2) / (n / 2);
                    // Edges at 0.5, center at 0.3
                    wave.progressPerX[i] = 0.3 + 0.2 * distFromCenter;
                }

                // Calculate initial variance
                const initialVariance = calculateVariance(wave.progressPerX);

                // Apply several updates with constant deep water (no new refraction)
                // Only lateral diffusion should act
                for (let t = 100; t <= 500; t += 100) {
                    wave.lastUpdateTime = t - 100;
                    updateWaveRefraction(wave, t, 10000, () => 30, 30);
                }

                // Variance should decrease (wave becoming straighter)
                const finalVariance = calculateVariance(wave.progressPerX);
                expect(finalVariance).toBeLessThan(initialVariance);
            });

            it('preserves average progress during diffusion', () => {
                const wave = createWave(0, 0.8);
                // Create bent wave
                const n = wave.progressPerX.length;
                for (let i = 0; i < n; i++) {
                    wave.progressPerX[i] = 0.4 + 0.1 * Math.sin(i * Math.PI / n);
                }

                const initialAvg = getAverageProgress(wave);

                // Apply diffusion with constant depth
                for (let t = 100; t <= 300; t += 100) {
                    wave.lastUpdateTime = t - 100;
                    updateWaveRefraction(wave, t, 100000, () => 30, 30); // very slow base speed
                }

                // Average should be approximately preserved
                const finalAvg = getAverageProgress(wave);
                expect(finalAvg).toBeCloseTo(initialAvg, 1);
            });

            it('wave reforms but retains slight orientation change', () => {
                const wave = createWave(0, 0.8);
                // Create asymmetric bend (left side ahead)
                const n = wave.progressPerX.length;
                for (let i = 0; i < n; i++) {
                    wave.progressPerX[i] = 0.5 - 0.1 * (i / n); // left at 0.5, right at 0.4
                }

                const initialSlope = wave.progressPerX[0] - wave.progressPerX[n - 1];

                // Apply many diffusion steps
                for (let t = 100; t <= 2000; t += 100) {
                    wave.lastUpdateTime = t - 100;
                    updateWaveRefraction(wave, t, 100000, () => 30, 30);
                }

                // Slope should reduce but not disappear entirely
                const finalSlope = wave.progressPerX[0] - wave.progressPerX[n - 1];
                expect(Math.abs(finalSlope)).toBeLessThan(Math.abs(initialSlope));
                // With boundary conditions, some slope is preserved
            });
        });

        describe('getAverageProgress', () => {
            it('returns 0 for new wave', () => {
                const wave = createWave(1000, 0.8);
                expect(getAverageProgress(wave)).toBe(0);
            });

            it('returns average of progressPerX values', () => {
                const wave = createWave(1000, 0.8);
                // Manually set some values
                wave.progressPerX[0] = 0.2;
                wave.progressPerX[1] = 0.4;
                wave.progressPerX[2] = 0.6;
                // Rest are 0

                const expectedAvg = (0.2 + 0.4 + 0.6) / WAVE_X_SAMPLES;
                expect(getAverageProgress(wave)).toBeCloseTo(expectedAvg, 5);
            });

            it('handles wave without progressPerX', () => {
                const wave = { id: 'test', amplitude: 0.5 };
                expect(getAverageProgress(wave)).toBe(0);
            });
        });

        describe('getProgressAtX', () => {
            it('returns correct progress for X position', () => {
                const wave = createWave(1000, 0.8);
                wave.progressPerX[0] = 0.1;
                wave.progressPerX[WAVE_X_SAMPLES - 1] = 0.9;

                expect(getProgressAtX(wave, 0)).toBe(0.1);
                expect(getProgressAtX(wave, 0.99)).toBe(0.9);
            });

            it('clamps X to valid range', () => {
                const wave = createWave(1000, 0.8);
                wave.progressPerX[0] = 0.1;
                wave.progressPerX[WAVE_X_SAMPLES - 1] = 0.9;

                // Out of bounds should clamp
                expect(getProgressAtX(wave, -0.5)).toBe(0.1);
                expect(getProgressAtX(wave, 1.5)).toBe(0.9);
            });

            it('handles wave without progressPerX', () => {
                const wave = { id: 'test', amplitude: 0.5 };
                expect(getProgressAtX(wave, 0.5)).toBe(0);
            });
        });
    });
});
