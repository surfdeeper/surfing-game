// Tests for main.js animation logic
// Verifies frame-rate independent animation using delta time

import { describe, it, expect } from 'vitest';

// Extract the update logic for testing
function createWorld() {
    return {
        swellSpacing: 80,
        swellSpeed: 50,
        swellOffset: 0,
    };
}

function update(world, deltaTime) {
    world.swellOffset += world.swellSpeed * deltaTime;
    if (world.swellOffset >= world.swellSpacing) {
        world.swellOffset -= world.swellSpacing;
    }
}

describe('Swell animation', () => {
    it('moves at consistent speed regardless of frame rate', () => {
        // Simulate 1 second at 60fps (60 frames, ~16.67ms each)
        const world60fps = createWorld();
        for (let i = 0; i < 60; i++) {
            update(world60fps, 1/60);
        }

        // Simulate 1 second at 30fps (30 frames, ~33.33ms each)
        const world30fps = createWorld();
        for (let i = 0; i < 30; i++) {
            update(world30fps, 1/30);
        }

        // Simulate 1 second in one big frame (lag spike)
        const worldLag = createWorld();
        update(worldLag, 1.0);

        // All should have moved 50 pixels (swellSpeed * 1 second)
        // Account for wrap-around: 50 % 80 = 50
        expect(world60fps.swellOffset).toBeCloseTo(50, 5);
        expect(world30fps.swellOffset).toBeCloseTo(50, 5);
        expect(worldLag.swellOffset).toBeCloseTo(50, 5);
    });

    it('wraps around at swellSpacing boundary', () => {
        const world = createWorld();

        // Move 2 seconds = 100 pixels, should wrap to 20 (100 - 80)
        update(world, 2.0);

        expect(world.swellOffset).toBeCloseTo(20, 5);
    });

    it('handles variable frame times correctly', () => {
        const world = createWorld();

        // Simulate irregular frame times (common in real browsers)
        update(world, 0.016);  // 16ms
        update(world, 0.020);  // 20ms (slow frame)
        update(world, 0.014);  // 14ms (fast frame)

        // Total: 50ms = 0.05s, should move 2.5 pixels
        expect(world.swellOffset).toBeCloseTo(2.5, 5);
    });
});
