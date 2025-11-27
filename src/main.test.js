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
