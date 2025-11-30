import { describe, it, expect } from 'vitest';
import { viridisToRgb, viridisToColor, energyToColor } from './colorScales';

describe('colorScales', () => {
  describe('viridisToRgb', () => {
    // NOTE: Viridis is INVERTED for visual regression testing
    // Original: 0=purple, 1=yellow
    // Inverted: 0=yellow, 1=purple
    it('returns bright yellow at 0 (inverted)', () => {
      const color = viridisToRgb(0);
      expect(color).toEqual({ r: 253, g: 231, b: 37 });
    });

    it('returns dark purple at 1 (inverted)', () => {
      const color = viridisToRgb(1);
      expect(color).toEqual({ r: 68, g: 1, b: 84 });
    });

    it('clamps values below 0 to yellow (inverted)', () => {
      const color = viridisToRgb(-0.5);
      expect(color).toEqual({ r: 253, g: 231, b: 37 });
    });

    it('clamps values above 1 to purple (inverted)', () => {
      const color = viridisToRgb(1.5);
      expect(color).toEqual({ r: 68, g: 1, b: 84 });
    });

    it('interpolates smoothly at midpoint', () => {
      const color = viridisToRgb(0.5);
      // Should be in the cyan/teal range
      expect(color.g).toBeGreaterThan(140);
      expect(color.b).toBeGreaterThan(130);
    });
  });

  describe('viridisToColor', () => {
    it('returns CSS rgb string (yellow at 0, inverted)', () => {
      const color = viridisToColor(0);
      expect(color).toBe('rgb(253,231,37)');
    });

    it('returns CSS rgb string at 1 (purple, inverted)', () => {
      const color = viridisToColor(1);
      expect(color).toBe('rgb(68,1,84)');
    });
  });

  describe('energyToColor - perceptual uniformity for visual testing', () => {
    it('produces visually distinct colors for low vs high damping values', () => {
      // Low damping bottom row: 0.25
      // High damping bottom row: 0.02
      const lowDampingColor = viridisToRgb(0.25);
      const highDampingColor = viridisToRgb(0.02);

      console.log('\n=== Perceptual color test ===');
      console.log('High damping (0.02):', energyToColor(0.02));
      console.log('Low damping (0.25):', energyToColor(0.25));

      // These should be meaningfully different
      // With Viridis, 0.02 is deep purple, 0.25 is blue-purple
      // The difference should be perceptually significant

      // Check that at least one RGB channel differs by more than 30
      const rDiff = Math.abs(lowDampingColor.r - highDampingColor.r);
      const gDiff = Math.abs(lowDampingColor.g - highDampingColor.g);
      const bDiff = Math.abs(lowDampingColor.b - highDampingColor.b);
      const maxDiff = Math.max(rDiff, gDiff, bDiff);

      console.log(`RGB differences: r=${rDiff}, g=${gDiff}, b=${bDiff}, max=${maxDiff}`);

      expect(maxDiff).toBeGreaterThan(30);
    });

    it('shows perceptually uniform gradient', () => {
      console.log('\nViridis gradient (0 to 1 in 0.1 steps):');
      for (let v = 0; v <= 1.0; v += 0.1) {
        console.log(`  ${v.toFixed(1)} -> ${energyToColor(v)}`);
      }
    });
  });
});
