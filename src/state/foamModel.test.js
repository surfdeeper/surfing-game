import { describe, it, expect, beforeEach } from 'vitest';
import {
    createFoam,
    resetFoamIdCounter,
    updateFoam,
    isFoamAlive,
    getActiveFoam,
} from './foamModel.js';

describe('foamModel', () => {
    beforeEach(() => {
        resetFoamIdCounter();
    });

    describe('createFoam', () => {
        it('creates foam with correct properties', () => {
            const foam = createFoam(5000, 0.4, 300, 'wave-1');
            expect(foam.id).toBe('foam-1');
            expect(foam.spawnTime).toBe(5000);
            expect(foam.x).toBe(0.4);
            expect(foam.y).toBe(300);
            expect(foam.opacity).toBe(1.0);
            expect(foam.sourceWaveId).toBe('wave-1');
        });

        it('increments foam ID for each new foam', () => {
            const foam1 = createFoam(5000, 0.4, 300, 'wave-1');
            const foam2 = createFoam(6000, 0.5, 350, 'wave-2');
            expect(foam1.id).toBe('foam-1');
            expect(foam2.id).toBe('foam-2');
        });
    });

    describe('updateFoam', () => {
        it('foam drifts toward shore slowly', () => {
            const foam = createFoam(5000, 0.4, 300, 'wave-1');
            const initialY = foam.y;
            updateFoam(foam, 1.0, 6000); // 1 second elapsed
            // Foam drifts slightly toward shore (0.005 * 100 * 1.0 = 0.5 pixels)
            expect(foam.y).toBeGreaterThan(initialY);
            expect(foam.y).toBeLessThan(initialY + 1); // Very small drift
        });

        it('foam fades over time', () => {
            const foam = createFoam(5000, 0.4, 300, 'wave-1');
            updateFoam(foam, 1.0, 8000); // 3 seconds elapsed
            expect(foam.opacity).toBeLessThan(1.0);
        });

        it('foam opacity reaches 0 after fade time', () => {
            const foam = createFoam(0, 0.4, 300, 'wave-1');
            foam.fadeJitter = 0; // Remove jitter for predictable test
            updateFoam(foam, 1.0, 16000); // 16 seconds (past 15s fade time)
            expect(foam.opacity).toBe(0);
        });
    });

    describe('isFoamAlive', () => {
        it('returns true for fresh foam', () => {
            const foam = createFoam(5000, 0.4, 300, 'wave-1');
            expect(isFoamAlive(foam)).toBe(true);
        });

        it('returns false for fully faded foam', () => {
            const foam = createFoam(5000, 0.4, 300, 'wave-1');
            foam.opacity = 0;
            expect(isFoamAlive(foam)).toBe(false);
        });
    });

    describe('getActiveFoam', () => {
        it('filters out faded foam', () => {
            const foamSegments = [
                createFoam(5000, 0.4, 300, 'wave-1'),
                createFoam(5000, 0.5, 400, 'wave-2'),
                createFoam(5000, 0.6, 500, 'wave-3'),
            ];
            foamSegments[0].opacity = 0; // fully faded
            foamSegments[1].opacity = 0; // fully faded

            const active = getActiveFoam(foamSegments);
            expect(active).toHaveLength(1);
            expect(active[0].id).toBe('foam-3');
        });

        it('returns empty array when all foam is faded', () => {
            const foamSegments = [
                createFoam(5000, 0.4, 300, 'wave-1'),
                createFoam(5000, 0.5, 400, 'wave-2'),
            ];
            foamSegments[0].opacity = 0;
            foamSegments[1].opacity = 0;

            const active = getActiveFoam(foamSegments);
            expect(active).toHaveLength(0);
        });
    });

    describe('Foam lifecycle', () => {
        it('foam deposits stay in place and fade', () => {
            const foam = createFoam(0, 0.4, 300, 'wave-1');
            foam.fadeJitter = 0; // Remove jitter for predictable test

            // At spawn: fully opaque, at spawn position
            expect(foam.opacity).toBe(1.0);
            expect(foam.y).toBe(300);

            // After 7.5 seconds: half faded (15s total fade time), still in same place
            updateFoam(foam, 7.5, 7500);
            expect(foam.opacity).toBeCloseTo(0.5, 1);
            // Y drifts slightly due to drift speed, but test the initial position effect
            expect(foam.y).toBeGreaterThan(299);

            // After 15 seconds total: fully faded
            updateFoam(foam, 7.5, 15000);
            expect(foam.opacity).toBe(0);
        });
    });
});
