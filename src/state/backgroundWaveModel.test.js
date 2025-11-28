import { describe, it, expect } from 'vitest';
import {
    BACKGROUND_CONFIG,
    createInitialBackgroundState,
    getNextBackgroundWaveTime,
    calculateBackgroundAmplitude,
    updateBackgroundWaveState,
} from './backgroundWaveModel.js';

// Helper: create a fixed random function for deterministic tests
const fixedRandom = (value) => () => value;

describe('backgroundWaveModel', () => {
    describe('BACKGROUND_CONFIG', () => {
        it('should have smaller amplitude range than set waves', () => {
            expect(BACKGROUND_CONFIG.minAmplitude).toBeLessThan(0.3); // Set waves start at 0.3
            expect(BACKGROUND_CONFIG.maxAmplitude).toBeLessThan(0.35); // Lull waves were 0.35 max
        });

        it('should have shorter interval than set waves', () => {
            // Set waves spawn every ~15s, background should be faster
            expect(BACKGROUND_CONFIG.baseInterval).toBeLessThan(15);
        });
    });

    describe('createInitialBackgroundState', () => {
        it('should initialize timeSinceLastWave to 0', () => {
            const state = createInitialBackgroundState();
            expect(state.timeSinceLastWave).toBe(0);
        });

        it('should set initial nextWaveTime', () => {
            const state = createInitialBackgroundState(BACKGROUND_CONFIG, fixedRandom(0.5));
            expect(state.nextWaveTime).toBe(BACKGROUND_CONFIG.baseInterval);
        });
    });

    describe('getNextBackgroundWaveTime', () => {
        it('should return base interval when random is 0.5', () => {
            const time = getNextBackgroundWaveTime(BACKGROUND_CONFIG, fixedRandom(0.5));
            expect(time).toBe(BACKGROUND_CONFIG.baseInterval);
        });

        it('should return min time when random is 0', () => {
            const time = getNextBackgroundWaveTime(BACKGROUND_CONFIG, fixedRandom(0));
            expect(time).toBe(BACKGROUND_CONFIG.baseInterval - BACKGROUND_CONFIG.intervalVariation);
        });

        it('should return max time when random is 1', () => {
            const time = getNextBackgroundWaveTime(BACKGROUND_CONFIG, fixedRandom(1));
            expect(time).toBe(BACKGROUND_CONFIG.baseInterval + BACKGROUND_CONFIG.intervalVariation);
        });
    });

    describe('calculateBackgroundAmplitude', () => {
        it('should return min amplitude when random is 0', () => {
            const amp = calculateBackgroundAmplitude(BACKGROUND_CONFIG, fixedRandom(0));
            expect(amp).toBe(BACKGROUND_CONFIG.minAmplitude);
        });

        it('should return max amplitude when random is 1', () => {
            const amp = calculateBackgroundAmplitude(BACKGROUND_CONFIG, fixedRandom(1));
            expect(amp).toBe(BACKGROUND_CONFIG.maxAmplitude);
        });

        it('should always be less than set wave minimum', () => {
            // Set waves have minAmplitude of 0.3
            const maxBackgroundAmp = calculateBackgroundAmplitude(BACKGROUND_CONFIG, fixedRandom(1));
            expect(maxBackgroundAmp).toBeLessThan(0.3);
        });
    });

    describe('updateBackgroundWaveState', () => {
        it('should advance timeSinceLastWave', () => {
            const state = createInitialBackgroundState(BACKGROUND_CONFIG, fixedRandom(0.5));
            const result = updateBackgroundWaveState(state, 1.0, BACKGROUND_CONFIG, fixedRandom(0.5));
            expect(result.state.timeSinceLastWave).toBe(1.0);
        });

        it('should not spawn when time has not elapsed', () => {
            const state = createInitialBackgroundState(BACKGROUND_CONFIG, fixedRandom(0.5));
            const result = updateBackgroundWaveState(state, 1.0, BACKGROUND_CONFIG, fixedRandom(0.5));
            expect(result.shouldSpawn).toBe(false);
        });

        it('should spawn when time has elapsed', () => {
            let state = createInitialBackgroundState(BACKGROUND_CONFIG, fixedRandom(0.5));
            // nextWaveTime is 3s with random 0.5
            const result = updateBackgroundWaveState(state, 4.0, BACKGROUND_CONFIG, fixedRandom(0.5));
            expect(result.shouldSpawn).toBe(true);
            expect(result.amplitude).toBeGreaterThanOrEqual(BACKGROUND_CONFIG.minAmplitude);
            expect(result.amplitude).toBeLessThanOrEqual(BACKGROUND_CONFIG.maxAmplitude);
        });

        it('should reset timer after spawning', () => {
            let state = createInitialBackgroundState(BACKGROUND_CONFIG, fixedRandom(0.5));
            const result = updateBackgroundWaveState(state, 4.0, BACKGROUND_CONFIG, fixedRandom(0.5));
            expect(result.state.timeSinceLastWave).toBe(0);
        });

        it('should set new nextWaveTime after spawning', () => {
            let state = createInitialBackgroundState(BACKGROUND_CONFIG, fixedRandom(0.5));
            const initialNextTime = state.nextWaveTime;
            const result = updateBackgroundWaveState(state, 4.0, BACKGROUND_CONFIG, fixedRandom(0.5));
            // New nextWaveTime should be set (may be same value with fixed random, but state should be fresh)
            expect(result.state.nextWaveTime).toBeDefined();
        });

        it('should spawn multiple waves over time', () => {
            let state = createInitialBackgroundState(BACKGROUND_CONFIG, fixedRandom(0.5));
            let spawnCount = 0;

            // Simulate 30 seconds
            for (let t = 0; t < 30; t++) {
                const result = updateBackgroundWaveState(state, 1.0, BACKGROUND_CONFIG, fixedRandom(0.5));
                state = result.state;
                if (result.shouldSpawn) spawnCount++;
            }

            // With 3s interval, should spawn ~10 waves in 30 seconds
            expect(spawnCount).toBeGreaterThanOrEqual(8);
            expect(spawnCount).toBeLessThanOrEqual(12);
        });
    });
});
