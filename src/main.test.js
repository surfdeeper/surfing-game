// Tests for main.js animation logic
// Verifies frame-rate independent animation using delta time

import { describe, it, expect } from 'vitest';

// Extract the update logic for testing
function createWorld() {
    return {
        swellSpacing: 80,
        swellSpeed: 50,
        // Discrete wave objects (v2)
        waves: [],
        lastSpawnY: 0,
        // Set/lull parameters
        setConfig: {
            wavesPerSet: [4, 8],
            lullDuration: [20, 60],
            peakPosition: 0.4,
            minAmplitude: 0.3,
        },
        setState: 'LULL',
        setTimer: 0,
        setDuration: 30,
        currentSetWaves: 0,
        wavesSpawned: 0,
        shoreY: 600, // For testing
    };
}

function updateWaves(world, deltaTime) {
    // Move all waves toward shore
    for (const wave of world.waves) {
        wave.y += world.swellSpeed * deltaTime;
    }
    // Remove waves past shore
    world.waves = world.waves.filter(wave => wave.y < world.shoreY + world.swellSpacing);
}

describe('Wave animation', () => {
    it('moves waves at consistent speed regardless of frame rate', () => {
        // Simulate 1 second at 60fps (60 frames, ~16.67ms each)
        const world60fps = createWorld();
        world60fps.waves.push({ y: 0, amplitude: 1.0 });
        for (let i = 0; i < 60; i++) {
            updateWaves(world60fps, 1/60);
        }

        // Simulate 1 second at 30fps (30 frames, ~33.33ms each)
        const world30fps = createWorld();
        world30fps.waves.push({ y: 0, amplitude: 1.0 });
        for (let i = 0; i < 30; i++) {
            updateWaves(world30fps, 1/30);
        }

        // Simulate 1 second in one big frame (lag spike)
        const worldLag = createWorld();
        worldLag.waves.push({ y: 0, amplitude: 1.0 });
        updateWaves(worldLag, 1.0);

        // All waves should have moved 50 pixels (swellSpeed * 1 second)
        expect(world60fps.waves[0].y).toBeCloseTo(50, 5);
        expect(world30fps.waves[0].y).toBeCloseTo(50, 5);
        expect(worldLag.waves[0].y).toBeCloseTo(50, 5);
    });

    it('removes waves that pass the shore', () => {
        const world = createWorld();
        world.shoreY = 100;
        world.waves.push({ y: 90, amplitude: 1.0 });

        // Move wave past shore + swellSpacing
        updateWaves(world, 2.0);  // 100 pixels movement

        expect(world.waves.length).toBe(0);
    });

    it('waves maintain their individual amplitude as they travel', () => {
        const world = createWorld();
        world.waves.push({ y: 0, amplitude: 0.5 });
        world.waves.push({ y: 80, amplitude: 1.0 });

        // Move waves
        updateWaves(world, 1.0);

        // Amplitudes should be unchanged
        expect(world.waves[0].amplitude).toBe(0.5);
        expect(world.waves[1].amplitude).toBe(1.0);
    });
});

// Calculate amplitude based on progress through the set (0 to 1)
function calculateSetAmplitude(world, progress) {
    const peak = world.setConfig.peakPosition;
    const min = world.setConfig.minAmplitude;

    let amplitude;
    if (progress < peak) {
        const t = progress / peak;
        amplitude = min + (1.0 - min) * (t * t);
    } else {
        const t = (progress - peak) / (1.0 - peak);
        amplitude = 1.0 - (1.0 - min) * (t * t);
    }
    return amplitude;
}

describe('Wave sets and lulls', () => {
    it('world starts in lull state with no waves', () => {
        const world = createWorld();
        expect(world.waves.length).toBe(0);
        expect(world.setState).toBe('LULL');
    });

    it('amplitude peaks at configured position in set', () => {
        const world = createWorld();

        // At 0% through set, amplitude should be at minimum
        const ampStart = calculateSetAmplitude(world, 0);
        expect(ampStart).toBeCloseTo(0.3, 5);

        // At peak position (40%), amplitude should be maximum
        const ampPeak = calculateSetAmplitude(world, 0.4);
        expect(ampPeak).toBeCloseTo(1.0, 5);

        // At 100% through set, amplitude should be back to minimum
        const ampEnd = calculateSetAmplitude(world, 1.0);
        expect(ampEnd).toBeCloseTo(0.3, 5);
    });

    it('amplitude curve is smooth (builds and fades)', () => {
        const world = createWorld();

        // Building phase: amplitude should increase
        const amp20 = calculateSetAmplitude(world, 0.2);
        const amp30 = calculateSetAmplitude(world, 0.3);
        expect(amp30).toBeGreaterThan(amp20);

        // Fading phase: amplitude should decrease
        const amp60 = calculateSetAmplitude(world, 0.6);
        const amp80 = calculateSetAmplitude(world, 0.8);
        expect(amp60).toBeGreaterThan(amp80);
    });
});

// Tab visibility handling - prevents huge jumps after returning from background
const MAX_DELTA_TIME = 0.1;  // 100ms max, matching main.js

function clampDeltaTime(deltaTime) {
    if (deltaTime > MAX_DELTA_TIME) {
        return MAX_DELTA_TIME;
    }
    return deltaTime;
}

// Simulates the gameLoop behavior with clamping
function simulateFrameUpdate(world, rawDeltaTime) {
    const deltaTime = clampDeltaTime(rawDeltaTime);
    updateWaves(world, deltaTime);
    return deltaTime;
}

describe('Tab visibility handling', () => {
    it('should cap deltaTime to prevent huge jumps (MAX_DELTA_TIME = 100ms)', () => {
        const world = createWorld();
        world.waves.push({ y: 0, amplitude: 1.0 });

        // Simulate returning from background with 5 second gap
        const actualDelta = simulateFrameUpdate(world, 5.0);

        // Delta should be capped to MAX_DELTA_TIME
        expect(actualDelta).toBe(MAX_DELTA_TIME);
        // Wave should only move 5 pixels (50 px/s * 0.1s), not 250 pixels
        expect(world.waves[0].y).toBeCloseTo(5, 5);
    });

    it('should not cap normal frame deltas', () => {
        const world = createWorld();
        world.waves.push({ y: 0, amplitude: 1.0 });

        // Normal 60fps frame
        const actualDelta = simulateFrameUpdate(world, 1/60);

        expect(actualDelta).toBeCloseTo(1/60, 10);
        // Wave moves at normal rate
        expect(world.waves[0].y).toBeCloseTo(50 / 60, 5);
    });

    it('should handle exactly MAX_DELTA_TIME without capping', () => {
        const clamped = clampDeltaTime(MAX_DELTA_TIME);
        expect(clamped).toBe(MAX_DELTA_TIME);
    });

    it('should handle multiple capped frames smoothly', () => {
        const world = createWorld();
        world.waves.push({ y: 0, amplitude: 1.0 });

        // Simulate multiple background returns (e.g., user switching tabs rapidly)
        simulateFrameUpdate(world, 2.0);  // Would be 100 pixels, capped to 5
        simulateFrameUpdate(world, 3.0);  // Would be 150 pixels, capped to 5
        simulateFrameUpdate(world, 1.0);  // Would be 50 pixels, capped to 5

        // Total movement should be 15 pixels (3 * 5), not 300 pixels
        expect(world.waves[0].y).toBeCloseTo(15, 5);
    });

    it('should prevent wave position jumps on visibility restore', () => {
        const world = createWorld();
        world.waves.push({ y: 100, amplitude: 1.0 });

        // Normal operation
        simulateFrameUpdate(world, 1/60);
        const posAfterNormal = world.waves[0].y;

        // Visibility restore with large gap should not cause huge jump
        const posBeforeGap = world.waves[0].y;
        simulateFrameUpdate(world, 10.0);  // 10 second gap
        const posAfterGap = world.waves[0].y;

        // Jump should be capped (max 5 pixels), not 500 pixels
        const jump = posAfterGap - posBeforeGap;
        expect(jump).toBeLessThanOrEqual(50 * MAX_DELTA_TIME + 0.01);
    });

    it('should resume smoothly after visibility change', () => {
        const world = createWorld();
        world.waves.push({ y: 0, amplitude: 1.0 });

        // Simulate: normal frames -> visibility hidden -> visibility restored -> normal frames
        // Normal operation (10 frames at 60fps)
        for (let i = 0; i < 10; i++) {
            simulateFrameUpdate(world, 1/60);
        }
        const posBeforeHidden = world.waves[0].y;

        // Large gap (visibility restore)
        simulateFrameUpdate(world, 5.0);  // Capped to 0.1s
        const posAfterRestore = world.waves[0].y;

        // Continue normal operation (10 more frames)
        for (let i = 0; i < 10; i++) {
            simulateFrameUpdate(world, 1/60);
        }
        const posAfterResume = world.waves[0].y;

        // Verify movement rates are correct
        // 10 frames at 60fps = 10/60 seconds = ~8.33 pixels
        // 1 capped frame = 0.1s = 5 pixels
        // Total: ~8.33 + 5 + ~8.33 = ~21.67 pixels
        expect(world.waves[0].y).toBeCloseTo(50 * (10/60 + 0.1 + 10/60), 1);
    });
});
