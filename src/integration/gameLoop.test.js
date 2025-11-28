import { describe, it, expect, beforeEach } from 'vitest';
import { createWave, getWaveProgress, getActiveWaves, resetWaveIdCounter } from '../state/waveModel.js';
import { progressToScreenY, getOceanBounds, calculateTravelDuration } from '../render/coordinates.js';
import {
    DEFAULT_CONFIG,
    STATE,
    createInitialState,
    updateSetLullState,
} from '../state/setLullModel.js';

// Fixed random function for deterministic tests
const fixedRandom = (value) => () => value;

// Simulated world settings matching main.js
const WORLD_CONFIG = {
    shoreHeight: 100,
    swellSpeed: 50,  // pixels per second
    swellSpacing: 80,
    canvasHeight: 800,
};

// Helper to create a simulated game state
function createGameState(config = DEFAULT_CONFIG, randomFn = fixedRandom(0.5)) {
    const { oceanBottom } = getOceanBounds(WORLD_CONFIG.canvasHeight, WORLD_CONFIG.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, WORLD_CONFIG.swellSpeed);

    return {
        waves: [],
        gameTime: 0,
        setLullState: createInitialState(config, randomFn),
        travelDuration,
        config,
    };
}

// Helper to simulate one update frame
function updateGameState(state, deltaTime, randomFn = fixedRandom(0.5)) {
    // Advance game time (in ms)
    const newGameTime = state.gameTime + deltaTime * 1000;

    // Update set/lull state machine
    const result = updateSetLullState(
        state.setLullState,
        deltaTime,
        state.config,
        randomFn
    );

    // Spawn wave if needed
    let newWaves = [...state.waves];
    if (result.shouldSpawn) {
        newWaves.push(createWave(newGameTime, result.amplitude));
    }

    // Remove completed waves (add buffer for visual spacing)
    const bufferDuration = (WORLD_CONFIG.swellSpacing / WORLD_CONFIG.swellSpeed) * 1000;
    newWaves = getActiveWaves(newWaves, newGameTime - bufferDuration, state.travelDuration);

    return {
        ...state,
        waves: newWaves,
        gameTime: newGameTime,
        setLullState: result.state,
    };
}

describe('Integration: Game Loop', () => {
    beforeEach(() => {
        resetWaveIdCounter();
    });

    describe('Full Cycle Tests', () => {
        it('should complete LULL → SET → LULL cycle in simulated time', () => {
            let state = createGameState();
            expect(state.setLullState.setState).toBe(STATE.LULL);

            // Advance through lull (30s)
            for (let t = 0; t < 35; t++) {
                state = updateGameState(state, 1.0);
            }
            expect(state.setLullState.setState).toBe(STATE.SET);

            // Advance through set until LULL
            for (let t = 0; t < 150; t++) {
                state = updateGameState(state, 1.0);
                if (state.setLullState.setState === STATE.LULL) break;
            }
            expect(state.setLullState.setState).toBe(STATE.LULL);
        });

        it('should spawn multiple sets over 5-minute simulation', () => {
            let state = createGameState();
            let setTransitions = 0;
            let lastState = state.setLullState.setState;

            // Simulate 5 minutes (300 seconds)
            for (let t = 0; t < 300; t++) {
                state = updateGameState(state, 1.0);
                if (state.setLullState.setState !== lastState) {
                    if (state.setLullState.setState === STATE.SET) {
                        setTransitions++;
                    }
                    lastState = state.setLullState.setState;
                }
            }

            // Should have at least 2 full sets in 5 minutes
            // (30s lull + ~90s set = ~120s per cycle, so 2-3 cycles)
            expect(setTransitions).toBeGreaterThanOrEqual(2);
        });

        it('should keep wave count bounded (old waves removed)', () => {
            let state = createGameState();
            let maxWaves = 0;

            // Simulate 3 minutes
            for (let t = 0; t < 180; t++) {
                state = updateGameState(state, 1.0);
                maxWaves = Math.max(maxWaves, state.waves.length);
            }

            // Waves should never exceed a reasonable bound
            // With ~15s spawn interval and ~14s travel duration, max ~2-3 active waves
            expect(maxWaves).toBeLessThan(10);
            // At end, should have some active waves but not too many
            expect(state.waves.length).toBeLessThan(5);
        });
    });

    describe('Wave Lifecycle Tests', () => {
        it('should spawn wave at horizon (progress = 0)', () => {
            let state = createGameState();
            // Advance until a wave spawns
            for (let t = 0; t < 20; t++) {
                state = updateGameState(state, 1.0);
                if (state.waves.length > 0) break;
            }

            expect(state.waves.length).toBeGreaterThan(0);
            const wave = state.waves[0];
            const progress = getWaveProgress(wave, state.gameTime, state.travelDuration);
            // Wave just spawned, should be very close to horizon
            expect(progress).toBeLessThan(0.1);
        });

        it('should progress wave toward shore over travelDuration', () => {
            let state = createGameState();
            // Advance until a wave spawns
            for (let t = 0; t < 20; t++) {
                state = updateGameState(state, 1.0);
                if (state.waves.length > 0) break;
            }

            const wave = state.waves[0];
            const initialProgress = getWaveProgress(wave, state.gameTime, state.travelDuration);

            // Advance half the travel duration
            const halfDuration = state.travelDuration / 2000; // convert ms to seconds
            for (let t = 0; t < halfDuration; t++) {
                state = updateGameState(state, 1.0);
            }

            const midProgress = getWaveProgress(wave, state.gameTime, state.travelDuration);
            expect(midProgress).toBeGreaterThan(initialProgress);
            expect(midProgress).toBeCloseTo(0.5, 1);
        });

        it('should remove wave after passing shore', () => {
            let state = createGameState();
            // Advance until a wave spawns
            for (let t = 0; t < 20; t++) {
                state = updateGameState(state, 1.0);
                if (state.waves.length > 0) break;
            }

            const waveId = state.waves[0].id;

            // Advance past travel duration + buffer
            const fullDuration = (state.travelDuration / 1000) + 5; // add buffer
            for (let t = 0; t < fullDuration; t++) {
                state = updateGameState(state, 1.0);
            }

            // Original wave should be removed
            const waveStillExists = state.waves.some(w => w.id === waveId);
            expect(waveStillExists).toBe(false);
        });

        it('should not leak memory over extended simulation', () => {
            let state = createGameState();
            const waveCounts = [];

            // Simulate 10 minutes, recording wave counts
            for (let t = 0; t < 600; t++) {
                state = updateGameState(state, 1.0);
                if (t % 60 === 0) {
                    waveCounts.push(state.waves.length);
                }
            }

            // Wave count should stay bounded, not grow unbounded
            const avgWaves = waveCounts.reduce((a, b) => a + b, 0) / waveCounts.length;
            expect(avgWaves).toBeLessThan(5);
            // No single sample should be huge
            expect(Math.max(...waveCounts)).toBeLessThan(10);
        });
    });

    describe('State + Render Integration', () => {
        it('should have multiple concurrent waves with correct relative positions', () => {
            let state = createGameState();
            // Use faster wave spawning to get multiple waves
            const fastConfig = { ...DEFAULT_CONFIG, swellPeriod: 5, periodVariation: 0 };
            state = createGameState(fastConfig);

            // Advance to get multiple waves
            for (let t = 0; t < 30; t++) {
                state = updateGameState(state, 1.0);
            }

            if (state.waves.length >= 2) {
                const progresses = state.waves.map(w =>
                    getWaveProgress(w, state.gameTime, state.travelDuration)
                );
                // All progresses should be between 0 and 1
                progresses.forEach(p => {
                    expect(p).toBeGreaterThanOrEqual(0);
                    expect(p).toBeLessThanOrEqual(1);
                });
            }
        });

        it('should have newer waves closer to horizon than older waves', () => {
            let state = createGameState();
            // Use faster wave spawning
            const fastConfig = { ...DEFAULT_CONFIG, swellPeriod: 5, periodVariation: 0 };
            state = createGameState(fastConfig);

            // Advance to get multiple waves
            for (let t = 0; t < 30; t++) {
                state = updateGameState(state, 1.0);
            }

            if (state.waves.length >= 2) {
                // Sort by spawn time (oldest first)
                const sortedByAge = [...state.waves].sort((a, b) => a.spawnTime - b.spawnTime);
                const progresses = sortedByAge.map(w =>
                    getWaveProgress(w, state.gameTime, state.travelDuration)
                );

                // Older waves (lower spawn time) should have higher progress (closer to shore)
                for (let i = 1; i < progresses.length; i++) {
                    expect(progresses[i - 1]).toBeGreaterThan(progresses[i]);
                }
            }
        });

        it('should have wave positions monotonically ordered by spawnTime', () => {
            let state = createGameState();
            const fastConfig = { ...DEFAULT_CONFIG, swellPeriod: 5, periodVariation: 0 };
            state = createGameState(fastConfig);

            // Advance to get multiple waves
            for (let t = 0; t < 30; t++) {
                state = updateGameState(state, 1.0);
            }

            if (state.waves.length >= 2) {
                const { oceanTop, oceanBottom } = getOceanBounds(
                    WORLD_CONFIG.canvasHeight,
                    WORLD_CONFIG.shoreHeight
                );

                // Sort by spawn time (oldest first)
                const sortedByAge = [...state.waves].sort((a, b) => a.spawnTime - b.spawnTime);
                const yPositions = sortedByAge.map(w => {
                    const progress = getWaveProgress(w, state.gameTime, state.travelDuration);
                    return progressToScreenY(progress, oceanTop, oceanBottom);
                });

                // Y positions should be strictly decreasing (older waves have higher Y = closer to shore)
                for (let i = 1; i < yPositions.length; i++) {
                    expect(yPositions[i - 1]).toBeGreaterThan(yPositions[i]);
                }
            }
        });

        it('should map progress to correct screen coordinates', () => {
            const { oceanTop, oceanBottom } = getOceanBounds(
                WORLD_CONFIG.canvasHeight,
                WORLD_CONFIG.shoreHeight
            );

            // Progress 0 (horizon) should be at top of ocean
            expect(progressToScreenY(0, oceanTop, oceanBottom)).toBe(oceanTop);

            // Progress 1 (shore) should be at bottom of ocean
            expect(progressToScreenY(1, oceanTop, oceanBottom)).toBe(oceanBottom);

            // Progress 0.5 should be in the middle
            const midY = progressToScreenY(0.5, oceanTop, oceanBottom);
            expect(midY).toBe((oceanTop + oceanBottom) / 2);
        });
    });
});
