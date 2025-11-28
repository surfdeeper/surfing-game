import { describe, it, expect, beforeEach } from 'vitest';
import {
    createEnergyField,
    createSwellSource,
    injectSwells,
    updateEnergyField,
    getHeightAt,
    resetRowAccumulator,
    FIELD_WIDTH,
    FIELD_HEIGHT,
} from './energyFieldModel.js';

describe('energyFieldModel', () => {
    beforeEach(() => {
        resetRowAccumulator();
    });

    describe('createEnergyField', () => {
        it('creates field with correct dimensions', () => {
            const field = createEnergyField();

            expect(field.width).toBe(FIELD_WIDTH);
            expect(field.gridHeight).toBe(FIELD_HEIGHT);
            expect(field.height.length).toBe(FIELD_WIDTH * FIELD_HEIGHT);
            expect(field.velocity.length).toBe(FIELD_WIDTH * FIELD_HEIGHT);
        });

        it('initializes height and velocity to zero', () => {
            const field = createEnergyField();

            // Check a few samples
            expect(field.height[0]).toBe(0);
            expect(field.height[field.height.length - 1]).toBe(0);
            expect(field.velocity[0]).toBe(0);
        });
    });

    describe('injectSwells', () => {
        it('injects energy at horizon row (y=0)', () => {
            const field = createEnergyField();
            const swells = [createSwellSource(10, 1.0, 0)];

            // At time 0 with phase 0, sin(0) = 0
            injectSwells(field, swells, 0);
            expect(field.height[0]).toBeCloseTo(0, 5);

            // At time = period/4, sin(π/2) = 1
            injectSwells(field, swells, 2.5); // period=10, so 2.5 = quarter period
            expect(field.height[0]).toBeCloseTo(1.0, 5);
        });

        it('sums multiple swells', () => {
            const field = createEnergyField();
            const swells = [
                createSwellSource(10, 0.5, 0),
                createSwellSource(10, 0.3, 0), // Same phase, same period
            ];

            // At quarter period, both peaks align
            injectSwells(field, swells, 2.5);
            expect(field.height[0]).toBeCloseTo(0.8, 5);
        });
    });

    describe('updateEnergyField', () => {
        it('propagates energy from horizon toward shore', () => {
            const field = createEnergyField();
            const getDepth = () => 10;
            const travelDuration = 12;

            // Inject a pulse at horizon
            for (let x = 0; x < field.width; x++) {
                field.height[x] = 1.0;
            }

            // Run 1 second of updates - should shift ~3 rows (40 rows / 12 sec)
            for (let i = 0; i < 60; i++) {
                updateEnergyField(field, getDepth, 1/60, travelDuration);
            }

            // Energy should have propagated to row 3
            const row3Idx = 3 * field.width + Math.floor(field.width / 2);
            expect(field.height[row3Idx]).toBeGreaterThan(0);
        });

        it('waves propagate uniformly across x (no refraction currently)', () => {
            const field = createEnergyField();

            // Inject pulse at horizon
            for (let x = 0; x < field.width; x++) {
                field.height[x] = 1.0;
            }

            const getDepth = () => 10;

            // Run updates
            for (let i = 0; i < 30; i++) {
                updateEnergyField(field, getDepth, 0.1);
            }

            // Sample energy at row 10, left vs right - should be similar
            const leftIdx = 10 * field.width + 10;
            const rightIdx = 10 * field.width + 50;

            // Both sides should have similar energy (uniform propagation)
            expect(Math.abs(field.height[leftIdx])).toBeCloseTo(
                Math.abs(field.height[rightIdx]),
                2
            );
        });
    });

    describe('getHeightAt', () => {
        it('returns height at grid points', () => {
            const field = createEnergyField();

            // Set a known value
            field.height[0] = 5.0;

            expect(getHeightAt(field, 0, 0)).toBe(5.0);
        });

        it('interpolates between grid points', () => {
            const field = createEnergyField();

            // Set corners of a 2x2 region
            field.height[0] = 0;
            field.height[1] = 2;
            field.height[field.width] = 2;
            field.height[field.width + 1] = 4;

            // Center should interpolate
            const centerX = 0.5 / (field.width - 1);
            const centerY = 0.5 / (field.gridHeight - 1);
            const centerHeight = getHeightAt(field, centerX, centerY);

            // Average of 0, 2, 2, 4 = 2
            expect(centerHeight).toBeCloseTo(2, 1);
        });
    });
});
