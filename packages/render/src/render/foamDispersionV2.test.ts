/**
 * Foam Dispersion V2 Tests
 *
 * Bug: As foam fades from top-down (older rows fade first),
 * the outer contour contracts to follow the fading.
 * It should expand or stay in place, not contract.
 */

import { describe, it, expect } from 'vitest';
import { buildIntensityGridOptionB, boxBlur } from './marchingSquares.js';

function gridToAscii(grid, w, h, threshold) {
  let s = '';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      s += grid[y * w + x] >= threshold ? '#' : '.';
    }
    s += '\n';
  }
  return s;
}

function topEdge(ascii) {
  const lines = ascii.trim().split('\n');
  for (let y = 0; y < lines.length; y++) {
    if (lines[y].includes('#')) return y;
  }
  return -1;
}

describe('Foam Dispersion V2', () => {
  it.skip('top edge should not move down as top rows fade', () => {
    // Simulate foam deposited over time (top rows are older)
    // This mimics actual game: wave travels down, depositing foam rows
    const baseFoamRows = [];
    for (let y = 0; y < 10; y++) {
      baseFoamRows.push({
        y: y * 10,
        spawnTime: 1000 + y * 500, // top=1000ms, bottom=5500ms
        segments: [{ startX: 0.3, endX: 0.7, intensity: 1.0 }],
      });
    }

    const w = 20,
      h = 20,
      canvasW = 200,
      canvasH = 200;
    const threshold = 0.05;
    const fadeTime = 4000; // 4s fade

    // Helper to add fading opacity based on game time
    const withOpacity = (rows, gameTime) =>
      rows.map((r) => ({
        ...r,
        opacity: Math.max(0, 1 - (gameTime - r.spawnTime) / fadeTime),
      }));

    // Track top edge over time - collect all frames first
    const times = [3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];
    const frames = [];

    console.log('\n=== Top edge over time ===\n');

    for (const t of times) {
      const rows = withOpacity(baseFoamRows, t);
      const { grid, blurPasses } = buildIntensityGridOptionB(rows, w, h, canvasW, canvasH, t);
      const blurred = boxBlur(grid, w, h, blurPasses);
      const ascii = gridToAscii(blurred, w, h, threshold);
      const top = topEdge(ascii);

      frames.push({ t, blurPasses, ascii, top });

      console.log(`t=${(t - 1000) / 1000}s (blur=${blurPasses}):`);
      console.log(ascii);
      console.log(`top edge: row ${top}\n`);
    }

    // Summary
    const firstTop = frames[0].top;
    console.log('=== Summary ===');
    console.log('Top edge position over time:');
    for (const f of frames) {
      const moved = f.top > firstTop ? ` ← MOVED DOWN by ${f.top - firstTop}` : '';
      console.log(`  t=${(f.t - 1000) / 1000}s: row ${f.top}${moved}`);
    }

    // Assert: top edge must never move down from initial position
    for (const f of frames) {
      expect(f.top, `t=${(f.t - 1000) / 1000}s: top edge moved down`).toBeLessThanOrEqual(firstTop);
    }
  });
});
