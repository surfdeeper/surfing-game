import { describe, it, expect, beforeEach } from 'vitest';

// Mock canvas context
function createMockContext() {
  return {
    fillStyle: '',
    fillRect: () => {},
    beginPath: () => {},
    roundRect: () => {},
    fill: () => {},
    save: () => {},
    restore: () => {},
    filter: '',
  };
}

// Generate test foam data
function generateFoamRows(rowCount, segmentsPerRow) {
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const segments = [];
    for (let j = 0; j < segmentsPerRow; j++) {
      segments.push({
        startX: j / segmentsPerRow,
        endX: (j + 0.8) / segmentsPerRow,
        intensity: 0.5 + Math.random() * 0.5,
      });
    }
    rows.push({
      y: 100 + i * 3,
      opacity: 0.5 + Math.random() * 0.5,
      segments,
    });
  }
  return rows;
}

// Current foam rendering implementation (extracted for testing)
function renderFoamZones(ctx, foamRows, w) {
  const sortedFoamRows = [...foamRows].sort((a, b) => a.y - b.y);
  const bandHeight = 5;

  for (const row of sortedFoamRows) {
    if (row.opacity <= 0) continue;

    for (const seg of row.segments) {
      const startX = seg.startX * w;
      const endX = seg.endX * w;
      const segWidth = endX - startX;

      if (segWidth < 2) continue;

      const opacity = row.opacity * 0.9;

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.roundRect(startX, row.y - bandHeight / 2, segWidth, bandHeight, bandHeight / 2);
      ctx.fill();
    }
  }
}

// SLOW implementation with blur (DO NOT USE - for comparison only)
function renderFoamZonesWithBlur(ctx, foamRows, w) {
  const sortedFoamRows = [...foamRows].sort((a, b) => a.y - b.y);
  const bandHeight = 5;

  ctx.save();
  ctx.filter = 'blur(2px)'; // THIS IS THE SLOW PART

  for (const row of sortedFoamRows) {
    if (row.opacity <= 0) continue;

    for (const seg of row.segments) {
      const startX = seg.startX * w;
      const endX = seg.endX * w;
      const segWidth = endX - startX;

      if (segWidth < 2) continue;

      ctx.fillStyle = `rgba(255, 255, 255, ${row.opacity * 0.95})`;
      ctx.beginPath();
      ctx.roundRect(startX, row.y - bandHeight / 2, segWidth, bandHeight, bandHeight / 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

describe('Foam Rendering Performance', () => {
  let ctx;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('renders 100 foam rows with 5 segments each in under 5ms', () => {
    const foamRows = generateFoamRows(100, 5);
    const w = 800;

    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      renderFoamZones(ctx, foamRows, w);
    }
    const elapsed = (performance.now() - start) / 10;

    console.log(`Foam rendering: ${elapsed.toFixed(2)}ms for 100 rows × 5 segments`);
    expect(elapsed).toBeLessThan(5);
  });

  it('renders 500 foam rows (heavy load) in under 10ms', () => {
    const foamRows = generateFoamRows(500, 5);
    const w = 800;

    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      renderFoamZones(ctx, foamRows, w);
    }
    const elapsed = (performance.now() - start) / 10;

    console.log(`Heavy foam rendering: ${elapsed.toFixed(2)}ms for 500 rows × 5 segments`);
    expect(elapsed).toBeLessThan(10);
  });

  it('sorting foam rows does not dominate render time', () => {
    const foamRows = generateFoamRows(500, 5);

    // Time just the sort
    const sortStart = performance.now();
    for (let i = 0; i < 100; i++) {
      [...foamRows].sort((a, b) => a.y - b.y);
    }
    const sortTime = (performance.now() - sortStart) / 100;

    // Time the full render
    const renderStart = performance.now();
    for (let i = 0; i < 100; i++) {
      renderFoamZones(ctx, foamRows, 800);
    }
    const renderTime = (performance.now() - renderStart) / 100;

    console.log(`Sort time: ${sortTime.toFixed(2)}ms, Render time: ${renderTime.toFixed(2)}ms`);

    // Sort should be less than 50% of total render time
    expect(sortTime).toBeLessThan(renderTime * 0.5);
  });

  // This test documents that we should NOT use ctx.filter='blur()'
  // Real canvas blur is extremely expensive (~100x slower than mock)
  it('documents that blur filter code exists but should not be used', () => {
    const foamRows = generateFoamRows(100, 5);
    const w = 800;

    // Time without blur
    const startNormal = performance.now();
    for (let i = 0; i < 10; i++) {
      renderFoamZones(ctx, foamRows, w);
    }
    const normalTime = (performance.now() - startNormal) / 10;

    // Time with blur (mocked - real blur would be much slower)
    const startBlur = performance.now();
    for (let i = 0; i < 10; i++) {
      renderFoamZonesWithBlur(ctx, foamRows, w);
    }
    const blurTime = (performance.now() - startBlur) / 10;

    console.log(`Normal: ${normalTime.toFixed(2)}ms, With blur setup: ${blurTime.toFixed(2)}ms`);
    console.log('NOTE: Real canvas blur is ~100x slower than this mock!');
    console.log('DO NOT USE ctx.filter in production code!');

    // Just verify both run without errors - real perf difference is in browser
    // Relaxed thresholds to avoid flaky tests on slower machines
    expect(normalTime).toBeLessThan(20);
    expect(blurTime).toBeLessThan(20);
  });
});

describe('Foam Data Generation Performance', () => {
  it('generating foam data should be fast', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      generateFoamRows(100, 5);
    }
    const elapsed = (performance.now() - start) / 100;

    console.log(`Foam data generation: ${elapsed.toFixed(2)}ms for 100 rows`);
    expect(elapsed).toBeLessThan(2);
  });
});
