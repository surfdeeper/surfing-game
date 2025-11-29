/**
 * Energy Field Propagation Tests
 *
 * These tests use small, explicit matrices to verify energy propagation behavior.
 * The output matrices are exported for use in Storybook stories.
 */
import { describe, it, expect } from 'vitest';
import { updateEnergyField, drainEnergyAt } from './energyFieldModel.js';

// Small field dimensions for readable test output
const SMALL_WIDTH = 5;
const SMALL_HEIGHT = 6;

/**
 * Create a small energy field for testing
 * @param {number[][]} initialMatrix - 2D array [row][col], row 0 = horizon
 */
function createSmallField(initialMatrix) {
    const height = new Float32Array(SMALL_WIDTH * SMALL_HEIGHT);

    for (let y = 0; y < SMALL_HEIGHT; y++) {
        for (let x = 0; x < SMALL_WIDTH; x++) {
            height[y * SMALL_WIDTH + x] = initialMatrix[y]?.[x] ?? 0;
        }
    }

    return {
        height,
        velocity: new Float32Array(SMALL_WIDTH * SMALL_HEIGHT),
        width: SMALL_WIDTH,
        gridHeight: SMALL_HEIGHT,
    };
}

/**
 * Extract field as 2D array for assertions and stories
 */
function fieldToMatrix(field, decimals = 2) {
    const matrix = [];
    for (let y = 0; y < field.gridHeight; y++) {
        const row = [];
        for (let x = 0; x < field.width; x++) {
            const val = field.height[y * field.width + x];
            row.push(Number(val.toFixed(decimals)));
        }
        matrix.push(row);
    }
    return matrix;
}

// Constant depth function (deep water, no damping effects)
const deepWater = () => 10;

// Shallow water gradient (depth decreases toward shore)
const shallowGradient = (normalizedX, normalizedY) => {
    // depth = 10 at horizon (y=0), depth = 0.5 at shore (y=1)
    return 10 - normalizedY * 9.5;
};

describe('Energy Field Propagation - Explicit Matrices', () => {
    describe('Basic propagation (deep water, no damping)', () => {
        // Initial state: energy pulse at horizon
        const INITIAL_PULSE = [
            [1.0, 1.0, 1.0, 1.0, 1.0],  // row 0 (horizon) - pulse
            [0.0, 0.0, 0.0, 0.0, 0.0],  // row 1
            [0.0, 0.0, 0.0, 0.0, 0.0],  // row 2
            [0.0, 0.0, 0.0, 0.0, 0.0],  // row 3
            [0.0, 0.0, 0.0, 0.0, 0.0],  // row 4
            [0.0, 0.0, 0.0, 0.0, 0.0],  // row 5 (shore)
        ];

        it('t=0: initial pulse at horizon', () => {
            const field = createSmallField(INITIAL_PULSE);
            const matrix = fieldToMatrix(field);

            expect(matrix).toEqual(INITIAL_PULSE);
        });

        it('t=1s: energy begins propagating downward', () => {
            const field = createSmallField(INITIAL_PULSE);
            const travelDuration = 6; // 6 rows in 6 seconds = 1 row/sec

            // Run 1 second of updates (60 frames)
            for (let i = 0; i < 60; i++) {
                updateEnergyField(field, deepWater, 1/60, travelDuration, {
                    depthDampingCoefficient: 0, // No damping for this test
                    depthDampingExponent: 1,
                });
            }

            const matrix = fieldToMatrix(field);

            // Energy should have spread to row 1
            expect(matrix[0][2]).toBeLessThan(1.0); // Horizon fading
            expect(matrix[1][2]).toBeGreaterThan(0.3); // Row 1 has energy
            expect(matrix[2][2]).toBeGreaterThan(0); // Row 2 starting to get energy
        });

        it('t=3s: energy band in middle of field', () => {
            const field = createSmallField(INITIAL_PULSE);
            const travelDuration = 6;

            // Run 3 seconds
            for (let i = 0; i < 180; i++) {
                updateEnergyField(field, deepWater, 1/60, travelDuration, {
                    depthDampingCoefficient: 0,
                    depthDampingExponent: 1,
                });
            }

            const matrix = fieldToMatrix(field);

            // Energy should be concentrated around rows 2-3
            expect(matrix[0][2]).toBeLessThan(0.3); // Horizon mostly faded
            expect(matrix[2][2]).toBeGreaterThan(0.2); // Mid-field has energy
            expect(matrix[3][2]).toBeGreaterThan(0.2);
            expect(matrix[5][2]).toBeLessThan(0.3); // Not yet at shore
        });
    });

    describe('Depth-based damping (shallow water decay)', () => {
        const INITIAL_PULSE = [
            [1.0, 1.0, 1.0, 1.0, 1.0],
            [0.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0],
        ];

        it('t=4s with damping: energy fades before reaching shore', () => {
            const field = createSmallField(INITIAL_PULSE);
            const travelDuration = 6;

            // Run 4 seconds with damping
            for (let i = 0; i < 240; i++) {
                updateEnergyField(field, shallowGradient, 1/60, travelDuration, {
                    depthDampingCoefficient: 0.1,
                    depthDampingExponent: 2.0,
                });
            }

            const matrix = fieldToMatrix(field);

            // Energy should be weaker near shore due to shallow water damping
            const midEnergy = matrix[3][2];
            const shoreEnergy = matrix[5][2];

            expect(shoreEnergy).toBeLessThan(midEnergy);
        });

        it('higher damping coefficient = faster decay', () => {
            const lowDampingField = createSmallField(INITIAL_PULSE);
            const highDampingField = createSmallField(INITIAL_PULSE);
            const travelDuration = 6;

            // Run both with different damping
            for (let i = 0; i < 180; i++) {
                updateEnergyField(lowDampingField, shallowGradient, 1/60, travelDuration, {
                    depthDampingCoefficient: 0.05,
                    depthDampingExponent: 2.0,
                });
                updateEnergyField(highDampingField, shallowGradient, 1/60, travelDuration, {
                    depthDampingCoefficient: 0.2,
                    depthDampingExponent: 2.0,
                });
            }

            const lowMatrix = fieldToMatrix(lowDampingField);
            const highMatrix = fieldToMatrix(highDampingField);

            // High damping should have less total energy
            const lowTotal = lowMatrix.flat().reduce((a, b) => a + b, 0);
            const highTotal = highMatrix.flat().reduce((a, b) => a + b, 0);

            expect(highTotal).toBeLessThan(lowTotal);
        });
    });

    describe('Energy drain (breaking simulation)', () => {
        it('draining creates visible gap in energy band', () => {
            // Start with energy already propagated to middle
            const MID_BAND = [
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.2, 0.2, 0.2, 0.2, 0.2],
                [0.8, 0.8, 0.8, 0.8, 0.8],  // Main energy band
                [0.5, 0.5, 0.5, 0.5, 0.5],
                [0.1, 0.1, 0.1, 0.1, 0.1],
                [0.0, 0.0, 0.0, 0.0, 0.0],
            ];

            const field = createSmallField(MID_BAND);

            // Drain energy at center column, row 2
            const drained = drainEnergyAt(field, 0.5, 2/5, 0.8);

            const matrix = fieldToMatrix(field);

            expect(drained).toBeCloseTo(0.8, 1);
            expect(matrix[2][2]).toBeLessThan(0.1); // Center is drained
            expect(matrix[2][0]).toBeCloseTo(0.8, 1); // Edges still have energy
            expect(matrix[2][4]).toBeCloseTo(0.8, 1);
        });
    });
});

/**
 * EXPORTED MATRICES FOR STORYBOOK
 * These exact matrices are rendered in EnergyFieldMatrix.stories.jsx
 */

// Helper to run simulation and capture matrices at specific times
export function captureProgression(options = {}) {
    const {
        depthDampingCoefficient = 0,
        depthDampingExponent = 1,
        depthFn = deepWater,
        travelDuration = 6,
        captureTimesSeconds = [0, 1, 2, 3, 4, 5],
    } = options;

    const INITIAL = [
        [1.0, 1.0, 1.0, 1.0, 1.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
    ];

    const field = createSmallField(INITIAL);
    const snapshots = [];
    let currentTime = 0;
    let captureIdx = 0;

    // Capture t=0
    if (captureTimesSeconds[0] === 0) {
        snapshots.push({ time: 0, matrix: fieldToMatrix(field) });
        captureIdx++;
    }

    // Run simulation
    const dt = 1/60;
    while (captureIdx < captureTimesSeconds.length) {
        updateEnergyField(field, depthFn, dt, travelDuration, {
            depthDampingCoefficient,
            depthDampingExponent,
        });
        currentTime += dt;

        // Check if we've reached next capture time
        if (currentTime >= captureTimesSeconds[captureIdx] - dt/2) {
            snapshots.push({
                time: captureTimesSeconds[captureIdx],
                matrix: fieldToMatrix(field),
            });
            captureIdx++;
        }
    }

    return snapshots;
}

// Pre-computed progressions for stories
export const PROGRESSION_NO_DAMPING = captureProgression({
    depthDampingCoefficient: 0,
    depthDampingExponent: 1,
    depthFn: deepWater,
});

export const PROGRESSION_WITH_DAMPING = captureProgression({
    depthDampingCoefficient: 0.1,
    depthDampingExponent: 2.0,
    depthFn: shallowGradient,
});

export const PROGRESSION_HIGH_DAMPING = captureProgression({
    depthDampingCoefficient: 0.2,
    depthDampingExponent: 2.0,
    depthFn: shallowGradient,
});

// Progression showing energy drain during wave breaking
// Drain early (t=1s) when energy is still concentrated, so the hole is dramatic
export const PROGRESSION_WITH_DRAIN = (() => {
    const INITIAL = [
        [1.0, 1.0, 1.0, 1.0, 1.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0],
    ];

    const field = createSmallField(INITIAL);
    const snapshots = [];
    const travelDuration = 6;
    const dt = 1/60;
    const drainTime = 1; // Drain early at t=1s when energy is concentrated
    const captureTimes = [0, 1, 2, 3, 4, 5];
    let currentTime = 0;
    let captureIdx = 0;
    let hasDrained = false;

    // Capture t=0
    snapshots.push({ time: 0, matrix: fieldToMatrix(field), label: 't=0s' });
    captureIdx++;

    while (captureIdx < captureTimes.length) {
        updateEnergyField(field, deepWater, dt, travelDuration, {
            depthDampingCoefficient: 0,
            depthDampingExponent: 1,
        });
        currentTime += dt;

        // Drain at t=1s - drain the entire center column aggressively
        if (!hasDrained && currentTime >= drainTime) {
            // Drain center column at multiple Y positions to create vertical stripe
            for (let y = 0; y < 6; y++) {
                const normalizedY = y / 5;
                drainEnergyAt(field, 0.5, normalizedY, 10.0); // drain all energy at center
            }
            hasDrained = true;
        }

        // Capture at specified times
        if (currentTime >= captureTimes[captureIdx] - dt/2) {
            const time = captureTimes[captureIdx];
            let label = `t=${time}s`;
            if (time === 1) label += ' (drain)';
            snapshots.push({
                time,
                matrix: fieldToMatrix(field),
                label,
            });
            captureIdx++;
        }
    }

    return snapshots;
})();
