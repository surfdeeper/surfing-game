// AI Player Model Tests

import { describe, it, expect } from 'vitest';
import {
    createAIState,
    updateAIPlayer,
    AI_STATE,
    AI_MODE,
} from './aiPlayerModel.js';
import { DEFAULT_BATHYMETRY } from './bathymetryModel.js';

// Use real bathymetry config - same as the game
function createMockWorld(overrides = {}) {
    return {
        waves: [],
        foamRows: [],
        gameTime: 0,
        bathymetry: DEFAULT_BATHYMETRY,
        ...overrides,
    };
}

function createMockPlayer(x, y) {
    return { x, y, vx: 0, vy: 0 };
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const OCEAN_TOP = 0;
const OCEAN_BOTTOM = 500;
const TRAVEL_DURATION = 10000;

// Derived from real bathymetry config
const PEAK_X = DEFAULT_BATHYMETRY.peakX * CANVAS_WIDTH; // 0.35 * 800 = 280

describe('AI Player Model', () => {
    describe('createAIState', () => {
        it('creates initial state with SEEKING', () => {
            const state = createAIState(AI_MODE.EXPERT);
            expect(state.state).toBe(AI_STATE.SEEKING);
            expect(state.mode).toBe(AI_MODE.EXPERT);
        });

        it('initializes stats to zero', () => {
            const state = createAIState(AI_MODE.EXPERT);
            expect(state.stats.wavesCaught).toBe(0);
            expect(state.stats.wipeouts).toBe(0);
        });
    });

    describe('SEEKING behavior', () => {
        // Expert target zone is 0.55-0.90 progress, center at 0.725
        const EXPERT_CENTER_Y = ((0.55 + 0.90) / 2) * OCEAN_BOTTOM;

        it('moves toward peak X when too far left (no foam)', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            const player = createMockPlayer(100, EXPERT_CENTER_Y); // Far left of peak
            const world = createMockWorld();

            const input = updateAIPlayer(
                player, aiState, world, 0.016,
                CANVAS_WIDTH, CANVAS_HEIGHT,
                OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
            );

            expect(input.right).toBe(true);
        });

        it('moves toward peak X when too far right (no foam)', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            const player = createMockPlayer(500, EXPERT_CENTER_Y); // Far right of peak
            const world = createMockWorld();

            const input = updateAIPlayer(
                player, aiState, world, 0.016,
                CANVAS_WIDTH, CANVAS_HEIGHT,
                OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
            );

            expect(input.left).toBe(true);
        });

        it('moves toward target zone when too far out (toward horizon)', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            const player = createMockPlayer(PEAK_X, 100); // At peak X, but too far from shore
            const world = createMockWorld();

            const input = updateAIPlayer(
                player, aiState, world, 0.016,
                CANVAS_WIDTH, CANVAS_HEIGHT,
                OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
            );

            expect(input.down).toBe(true); // Move toward shore to reach target zone
        });

        it('stays still when at default position with no foam', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            const player = createMockPlayer(PEAK_X, EXPERT_CENTER_Y);
            const world = createMockWorld();

            const input = updateAIPlayer(
                player, aiState, world, 0.016,
                CANVAS_WIDTH, CANVAS_HEIGHT,
                OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
            );

            expect(input.up).toBe(false);
            expect(input.down).toBe(false);
            expect(input.left).toBe(false);
            expect(input.right).toBe(false);
        });

        it('moves toward foam when foam is found in target zone', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            // Player at peak X but foam is to the right
            const player = createMockPlayer(PEAK_X, EXPERT_CENTER_Y);
            const foamY = 0.70 * OCEAN_BOTTOM; // In expert zone (0.55-0.90)
            const world = createMockWorld({
                foamRows: [{
                    y: foamY,
                    opacity: 1.0,
                    segments: [{ startX: 0.5, endX: 0.7, intensity: 0.5 }] // Foam to the right
                }]
            });

            const input = updateAIPlayer(
                player, aiState, world, 0.016,
                CANVAS_WIDTH, CANVAS_HEIGHT,
                OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
            );

            // Should move toward foam (right and down since foam is at different Y)
            expect(input.right).toBe(true);
        });

        it('catches wave when in foam', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            const playerY = 0.70 * OCEAN_BOTTOM;
            const player = createMockPlayer(PEAK_X, playerY);
            // Foam right at player position
            const world = createMockWorld({
                foamRows: [{
                    y: playerY,
                    opacity: 1.0,
                    segments: [{ startX: 0, endX: 1, intensity: 0.5 }]
                }]
            });

            // Run multiple times - wipeout is only 1% chance for expert
            for (let i = 0; i < 10; i++) {
                aiState.state = AI_STATE.SEEKING;
                updateAIPlayer(
                    player, aiState, world, 0.016,
                    CANVAS_WIDTH, CANVAS_HEIGHT,
                    OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
                );
                if (aiState.state === AI_STATE.RIDING) break;
            }

            expect(aiState.state).toBe(AI_STATE.RIDING);
        });
    });

    describe('RIDING behavior', () => {
        const RIDE_Y = 0.70 * OCEAN_BOTTOM;

        it('rides along diagonal: sideways plus up (toward horizon)', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            aiState.state = AI_STATE.RIDING;
            aiState.rideDirection = 1;
            aiState.lastPos = { x: PEAK_X, y: RIDE_Y };

            const player = createMockPlayer(PEAK_X, RIDE_Y);
            const world = createMockWorld({
                foamRows: [{
                    y: RIDE_Y,
                    opacity: 1.0,
                    segments: [{ startX: 0, endX: 1, intensity: 0.5 }]
                }]
            });

            const input = updateAIPlayer(
                player, aiState, world, 0.016,
                CANVAS_WIDTH, CANVAS_HEIGHT,
                OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
            );

            expect(input.right).toBe(true);
            expect(input.up).toBe(true); // Moves toward horizon to follow diagonal foam peel
            expect(input.left).toBe(false);
        });

        it('ends ride when foam dissipates', () => {
            const aiState = createAIState(AI_MODE.EXPERT);
            aiState.state = AI_STATE.RIDING;
            aiState.rideTimer = 1.0; // Already riding for 1 second

            const player = createMockPlayer(PEAK_X, RIDE_Y);
            const world = createMockWorld(); // No foam

            updateAIPlayer(
                player, aiState, world, 0.016,
                CANVAS_WIDTH, CANVAS_HEIGHT,
                OCEAN_TOP, OCEAN_BOTTOM, TRAVEL_DURATION
            );

            expect(aiState.state).toBe(AI_STATE.SEEKING);
        });
    });

    describe('Mode configs', () => {
        it('EXPERT targets the peak triangle zone (0.55-0.90 progress)', () => {
            const state = createAIState(AI_MODE.EXPERT);
            // Peak starts at 0.55, expert surfs the triangle from there to near shore
            expect(state.config.minProgress).toBe(0.55);
            expect(state.config.maxProgress).toBe(0.90);
        });

        it('EXPERT has low wipeout chance', () => {
            const state = createAIState(AI_MODE.EXPERT);
            expect(state.config.wipeoutChance).toBe(0.01);
        });
    });
});
