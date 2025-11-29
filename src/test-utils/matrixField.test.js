/**
 * Matrix↔Field Utility Tests
 *
 * CRITICAL: These utilities are the foundation of the progression testing framework.
 * If matrixToField or fieldToMatrix are broken, ALL progression-based tests become
 * untrustworthy - they would pass or fail based on conversion bugs, not actual
 * simulation behavior.
 *
 * These tests must pass before any progression tests are meaningful.
 */
import { describe, it, expect } from 'vitest';
import {
    matrixToField,
    fieldToMatrix,
    cloneField,
    matricesEqual,
    matrixTotalEnergy,
    matrixMax,
    matrixPeakRow,
} from './matrixField.js';

describe('matrixField utilities', () => {
    describe('matrixToField', () => {
        it('converts 2D matrix to flat Float32Array field', () => {
            const matrix = [
                [1.0, 2.0, 3.0],
                [4.0, 5.0, 6.0],
            ];

            const field = matrixToField(matrix);

            expect(field.width).toBe(3);
            expect(field.gridHeight).toBe(2);
            expect(field.height).toBeInstanceOf(Float32Array);
            expect(field.velocity).toBeInstanceOf(Float32Array);
            expect(field.height.length).toBe(6);
        });

        it('preserves values in row-major order', () => {
            const matrix = [
                [1.0, 2.0],
                [3.0, 4.0],
            ];

            const field = matrixToField(matrix);

            // Row 0: [1, 2], Row 1: [3, 4]
            // Flat: [1, 2, 3, 4]
            expect(field.height[0]).toBe(1.0); // [0][0]
            expect(field.height[1]).toBe(2.0); // [0][1]
            expect(field.height[2]).toBe(3.0); // [1][0]
            expect(field.height[3]).toBe(4.0); // [1][1]
        });

        it('handles empty matrix', () => {
            const matrix = [];

            const field = matrixToField(matrix);

            expect(field.width).toBe(0);
            expect(field.gridHeight).toBe(0);
            expect(field.height.length).toBe(0);
        });

        it('handles single cell matrix', () => {
            const matrix = [[42.5]];

            const field = matrixToField(matrix);

            expect(field.width).toBe(1);
            expect(field.gridHeight).toBe(1);
            expect(field.height[0]).toBe(42.5);
        });

        it('handles sparse matrix with missing values', () => {
            const matrix = [
                [1.0, 2.0],
                [3.0], // Missing second element
            ];

            const field = matrixToField(matrix);

            expect(field.height[0]).toBe(1.0);
            expect(field.height[1]).toBe(2.0);
            expect(field.height[2]).toBe(3.0);
            expect(field.height[3]).toBe(0); // Default for missing
        });

        it('initializes velocity array to zeros', () => {
            const matrix = [
                [1.0, 2.0],
                [3.0, 4.0],
            ];

            const field = matrixToField(matrix);

            expect(field.velocity.every(v => v === 0)).toBe(true);
        });
    });

    describe('fieldToMatrix', () => {
        it('converts flat field back to 2D matrix', () => {
            const field = {
                height: new Float32Array([1, 2, 3, 4, 5, 6]),
                velocity: new Float32Array(6),
                width: 3,
                gridHeight: 2,
            };

            const matrix = fieldToMatrix(field);

            expect(matrix).toEqual([
                [1, 2, 3],
                [4, 5, 6],
            ]);
        });

        it('rounds to specified decimal places', () => {
            const field = {
                height: new Float32Array([1.23456789, 2.98765432]),
                velocity: new Float32Array(2),
                width: 2,
                gridHeight: 1,
            };

            const matrix2 = fieldToMatrix(field, { decimals: 2 });
            const matrix4 = fieldToMatrix(field, { decimals: 4 });

            expect(matrix2[0][0]).toBe(1.23);
            expect(matrix2[0][1]).toBe(2.99);
            expect(matrix4[0][0]).toBe(1.2346);
            expect(matrix4[0][1]).toBe(2.9877);
        });

        it('defaults to 2 decimal places', () => {
            const field = {
                height: new Float32Array([1.999]),
                velocity: new Float32Array(1),
                width: 1,
                gridHeight: 1,
            };

            const matrix = fieldToMatrix(field);

            expect(matrix[0][0]).toBe(2); // 1.999 rounds to 2.00
        });
    });

    describe('round-trip conversion', () => {
        it('matrix → field → matrix preserves values (within 2 decimal rounding)', () => {
            // Use values that survive 2-decimal rounding
            const original = [
                [0.5, 0.75, 1.0],
                [0.25, 0.0, 0.12],
            ];

            const field = matrixToField(original);
            const roundTrip = fieldToMatrix(field);

            expect(roundTrip).toEqual(original);
        });

        it('demonstrates rounding behavior (0.125 → 0.13)', () => {
            const original = [[0.125]];
            const field = matrixToField(original);
            const roundTrip = fieldToMatrix(field);

            // 0.125 rounds to 0.13 with 2 decimals
            expect(roundTrip[0][0]).toBe(0.13);
            expect(roundTrip[0][0]).not.toBe(0.125);
        });

        it('handles the standard test matrix (5x6 pulse)', () => {
            const pulse = [
                [1.0, 1.0, 1.0, 1.0, 1.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
            ];

            const field = matrixToField(pulse);
            const roundTrip = fieldToMatrix(field);

            expect(roundTrip).toEqual(pulse);
            expect(field.width).toBe(5);
            expect(field.gridHeight).toBe(6);
        });
    });

    describe('cloneField', () => {
        it('creates independent copy of field', () => {
            const original = matrixToField([
                [1.0, 2.0],
                [3.0, 4.0],
            ]);

            const clone = cloneField(original);

            // Modify original
            original.height[0] = 999;
            original.velocity[0] = 888;

            // Clone should be unaffected
            expect(clone.height[0]).toBe(1.0);
            expect(clone.velocity[0]).toBe(0);
        });

        it('preserves dimensions', () => {
            const original = matrixToField([
                [1, 2, 3],
                [4, 5, 6],
            ]);

            const clone = cloneField(original);

            expect(clone.width).toBe(original.width);
            expect(clone.gridHeight).toBe(original.gridHeight);
        });
    });

    describe('matricesEqual', () => {
        it('returns true for identical matrices', () => {
            const a = [[1, 2], [3, 4]];
            const b = [[1, 2], [3, 4]];

            expect(matricesEqual(a, b)).toBe(true);
        });

        it('returns true for matrices within tolerance', () => {
            const a = [[1.0, 2.0]];
            const b = [[1.0005, 2.0005]];

            expect(matricesEqual(a, b, 0.001)).toBe(true);
        });

        it('returns false for matrices outside tolerance', () => {
            const a = [[1.0, 2.0]];
            const b = [[1.01, 2.0]];

            expect(matricesEqual(a, b, 0.001)).toBe(false);
        });

        it('returns false for different dimensions', () => {
            const a = [[1, 2], [3, 4]];
            const b = [[1, 2, 3]];

            expect(matricesEqual(a, b)).toBe(false);
        });

        it('returns false for different row lengths', () => {
            const a = [[1, 2], [3, 4]];
            const b = [[1, 2], [3]];

            expect(matricesEqual(a, b)).toBe(false);
        });
    });

    describe('matrixTotalEnergy', () => {
        it('sums all positive values', () => {
            const matrix = [
                [1.0, 2.0],
                [3.0, 4.0],
            ];

            expect(matrixTotalEnergy(matrix)).toBe(10.0);
        });

        it('ignores negative values', () => {
            const matrix = [
                [1.0, -2.0],
                [3.0, -4.0],
            ];

            expect(matrixTotalEnergy(matrix)).toBe(4.0); // 1 + 3
        });

        it('returns 0 for empty matrix', () => {
            expect(matrixTotalEnergy([])).toBe(0);
        });

        it('returns 0 for all-zero matrix', () => {
            const matrix = [
                [0, 0],
                [0, 0],
            ];

            expect(matrixTotalEnergy(matrix)).toBe(0);
        });
    });

    describe('matrixMax', () => {
        it('finds maximum value', () => {
            const matrix = [
                [1.0, 5.0],
                [3.0, 2.0],
            ];

            expect(matrixMax(matrix)).toBe(5.0);
        });

        it('handles negative values', () => {
            const matrix = [
                [-1.0, -5.0],
                [-3.0, -2.0],
            ];

            expect(matrixMax(matrix)).toBe(-1.0);
        });

        it('handles single element', () => {
            expect(matrixMax([[42]])).toBe(42);
        });
    });

    describe('matrixPeakRow', () => {
        it('finds row with highest total energy', () => {
            const matrix = [
                [0.1, 0.1, 0.1],  // row 0: sum = 0.3
                [0.5, 0.5, 0.5],  // row 1: sum = 1.5 (peak)
                [0.2, 0.2, 0.2],  // row 2: sum = 0.6
            ];

            expect(matrixPeakRow(matrix)).toBe(1);
        });

        it('returns 0 for uniform matrix', () => {
            const matrix = [
                [1, 1, 1],
                [1, 1, 1],
            ];

            // First row with max sum wins
            expect(matrixPeakRow(matrix)).toBe(0);
        });

        it('handles standard pulse at horizon', () => {
            const pulse = [
                [1.0, 1.0, 1.0, 1.0, 1.0],  // row 0 (horizon) - peak
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0, 0.0, 0.0],
            ];

            expect(matrixPeakRow(pulse)).toBe(0);
        });
    });
});
