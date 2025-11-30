import { describe, it, expect } from 'vitest';
import { updateFoamLifecycle, updateFoamRowLifecycle } from './index.js';

describe('update/index performance', () => {
  it('updateFoamLifecycle handles 20,000 segments under 16ms', () => {
    // Warmup iterations to let JIT optimize
    const warmupSegments = Array.from({ length: 1000 }, (_, i) => ({
      id: `foam-${i}`,
      spawnTime: i * 10,
      x: Math.random(),
      y: Math.random() * 500,
      opacity: 0.5 + Math.random() * 0.5,
      fadeJitter: (Math.random() - 0.5) * 10000,
    }));

    for (let i = 0; i < 10; i++) {
      updateFoamLifecycle(warmupSegments, 0.016, 50000);
    }

    // Create large foam array (simulates heavy foam accumulation)
    const foamSegments = [];
    for (let i = 0; i < 20000; i++) {
      foamSegments.push({
        id: `foam-${i}`,
        spawnTime: i * 10,
        x: Math.random(),
        y: Math.random() * 500,
        opacity: 0.5 + Math.random() * 0.5,
        fadeJitter: (Math.random() - 0.5) * 10000,
      });
    }

    // Measure averaged over multiple iterations for stability
    const iterations = 5;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      updateFoamLifecycle(foamSegments, 0.016, 50000);
    }
    const elapsed = (performance.now() - start) / iterations;

    console.log(`updateFoamLifecycle (warmed, 20k segments): ${elapsed.toFixed(2)}ms`);

    // Must complete within 16ms (one frame at 60fps)
    expect(elapsed).toBeLessThan(16);
  });

  it('updateFoamRowLifecycle handles 500+ rows under 16ms', () => {
    // Warmup iterations
    const warmupRows = Array.from({ length: 100 }, (_, i) => ({
      y: i * 2,
      spawnTime: i * 10,
      segments: [{ startX: 0, endX: 0.5, intensity: 0.8 }],
      opacity: 1,
    }));

    for (let i = 0; i < 10; i++) {
      updateFoamRowLifecycle(warmupRows, 50000);
    }

    // Create large foam row array
    const foamRows = [];
    for (let i = 0; i < 600; i++) {
      foamRows.push({
        y: i * 2,
        spawnTime: i * 10,
        segments: [{ startX: 0, endX: 0.5, intensity: 0.8 }],
        opacity: 1,
      });
    }

    // Measure averaged over multiple iterations
    const iterations = 5;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      updateFoamRowLifecycle(foamRows, 50000);
    }
    const elapsed = (performance.now() - start) / iterations;

    console.log(`updateFoamRowLifecycle (warmed, 600 rows): ${elapsed.toFixed(2)}ms`);

    // Must complete within 16ms (one frame at 60fps)
    expect(elapsed).toBeLessThan(16);
  });
});
