import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFpsTracker } from './fpsTracker.js';

describe('fpsTracker', () => {
    let tracker;

    beforeEach(() => {
        tracker = createFpsTracker();
    });

    describe('update', () => {
        it('returns clamped delta time', () => {
            // First call sets lastTime
            tracker.update(0);

            // Normal frame (16.67ms = 60fps)
            const delta = tracker.update(16.67);
            expect(delta).toBeCloseTo(0.01667, 3);
        });

        it('clamps delta time to MAX_DELTA_TIME (0.1s)', () => {
            tracker.update(0);

            // Huge jump (simulating tab restore)
            const delta = tracker.update(5000); // 5 seconds later
            expect(delta).toBe(0.1); // clamped to 100ms
        });

        it('clamps first frame delta to MAX_DELTA_TIME', () => {
            // First frame: lastTime=0, so delta = timestamp/1000, clamped to 0.1
            const delta = tracker.update(1000);
            expect(delta).toBe(0.1); // clamped
        });
    });

    describe('getDisplayFps', () => {
        it('starts at 60 fps', () => {
            expect(tracker.getDisplayFps()).toBe(60);
        });

        it('smooths FPS with exponential moving average', () => {
            tracker.update(0);
            tracker.update(16.67); // ~60fps
            tracker.update(33.34); // ~60fps
            tracker.update(50); // ~60fps

            const fps = tracker.getDisplayFps();
            expect(fps).toBeGreaterThan(50);
            expect(fps).toBeLessThan(70);
        });
    });

    describe('bad FPS hold', () => {
        it('drops smoothed FPS with sustained slow frames', () => {
            tracker.update(0);

            // Many slow frames (100ms each = 10fps) should drop smoothed FPS
            for (let i = 1; i <= 50; i++) {
                tracker.update(i * 100);
            }

            // Check FPS dropped significantly
            const fps = tracker.getDisplayFps();
            expect(fps).toBeLessThan(30);
        });
    });

    describe('resetTiming', () => {
        it('resets lastTime', () => {
            vi.spyOn(performance, 'now').mockReturnValue(5000);

            tracker.update(0);
            tracker.update(1000); // normal

            tracker.resetTiming();

            // After reset, next frame should have small delta
            vi.spyOn(performance, 'now').mockReturnValue(5016.67);
            // Note: resetTiming sets lastTime = performance.now()
            // So next update should be based on that
        });
    });
});
