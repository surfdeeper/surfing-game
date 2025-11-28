import { describe, it, expect, beforeEach } from 'vitest';
import {
    createWave,
    resetWaveIdCounter,
    getWaveProgress,
    isWaveComplete,
    getActiveWaves,
} from './waveModel.js';

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
});
