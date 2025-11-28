import { describe, it, expect } from 'vitest';
import {
    progressToScreenY,
    screenYToProgress,
    getOceanBounds,
    calculateTravelDuration,
} from './coordinates.js';

describe('coordinates', () => {
    describe('progressToScreenY', () => {
        it('progress 0 maps to ocean top', () => {
            expect(progressToScreenY(0, 0, 500)).toBe(0);
        });

        it('progress 1 maps to ocean bottom', () => {
            expect(progressToScreenY(1, 0, 500)).toBe(500);
        });

        it('progress 0.5 maps to midpoint', () => {
            expect(progressToScreenY(0.5, 0, 500)).toBe(250);
        });

        it('handles non-zero ocean top', () => {
            expect(progressToScreenY(0, 100, 600)).toBe(100);
            expect(progressToScreenY(1, 100, 600)).toBe(600);
            expect(progressToScreenY(0.5, 100, 600)).toBe(350);
        });
    });

    describe('screenYToProgress', () => {
        it('ocean top maps to progress 0', () => {
            expect(screenYToProgress(0, 0, 500)).toBe(0);
        });

        it('ocean bottom maps to progress 1', () => {
            expect(screenYToProgress(500, 0, 500)).toBe(1);
        });

        it('midpoint maps to progress 0.5', () => {
            expect(screenYToProgress(250, 0, 500)).toBe(0.5);
        });

        it('round-trips with progressToScreenY', () => {
            const oceanTop = 0;
            const oceanBottom = 500;
            for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
                const y = progressToScreenY(progress, oceanTop, oceanBottom);
                const backToProgress = screenYToProgress(y, oceanTop, oceanBottom);
                expect(backToProgress).toBeCloseTo(progress);
            }
        });
    });

    describe('getOceanBounds', () => {
        it('calculates ocean bounds from canvas height', () => {
            const bounds = getOceanBounds(600, 100);
            expect(bounds.oceanTop).toBe(0);
            expect(bounds.oceanBottom).toBe(500);
            expect(bounds.shoreY).toBe(500);
        });

        it('handles different shore heights', () => {
            const bounds = getOceanBounds(800, 150);
            expect(bounds.oceanTop).toBe(0);
            expect(bounds.oceanBottom).toBe(650);
            expect(bounds.shoreY).toBe(650);
        });
    });

    describe('calculateTravelDuration', () => {
        it('calculates travel time in milliseconds', () => {
            // 500px ocean, 50px/s speed = 10 seconds = 10000ms
            expect(calculateTravelDuration(500, 50)).toBe(10000);
        });

        it('faster speed means shorter duration', () => {
            // 500px ocean, 100px/s speed = 5 seconds = 5000ms
            expect(calculateTravelDuration(500, 100)).toBe(5000);
        });

        it('larger ocean means longer duration', () => {
            // 1000px ocean, 50px/s speed = 20 seconds = 20000ms
            expect(calculateTravelDuration(1000, 50)).toBe(20000);
        });
    });
});
