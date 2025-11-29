import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BATHYMETRY,
  getDepth,
  getMinDepth,
  getPeakX,
  shouldBreak,
  amplitudeToHeight,
} from './bathymetryModel.js';

describe('bathymetryModel', () => {
  describe('DEFAULT_BATHYMETRY', () => {
    it('has reasonable default values', () => {
      expect(DEFAULT_BATHYMETRY.deepDepth).toBe(30);
      expect(DEFAULT_BATHYMETRY.shoreDepth).toBe(0.5);
      expect(DEFAULT_BATHYMETRY.peakX).toBe(0.35);
      expect(DEFAULT_BATHYMETRY.peakWidth).toBe(0.2);
      expect(DEFAULT_BATHYMETRY.peakShallowBonus).toBe(12);
      expect(DEFAULT_BATHYMETRY.peakStartProgress).toBe(0.55);
      // Sandbar config (organic blob shape)
      expect(DEFAULT_BATHYMETRY.sandbar.baseProgress).toBe(0.35);
      expect(DEFAULT_BATHYMETRY.sandbar.width).toBe(0.12);
      expect(DEFAULT_BATHYMETRY.sandbar.shallowBonus).toBe(18);
      expect(DEFAULT_BATHYMETRY.sandbar.lobes).toHaveLength(5);
      expect(DEFAULT_BATHYMETRY.sandbar.lobeWidth).toBe(0.25);
    });
  });

  describe('getDepth (2D)', () => {
    describe('Y-axis (progress) behavior', () => {
      it('returns deep depth at horizon (progress=0)', () => {
        // Use x=0.9 which is far from peak (0.4), so no peak bonus
        const depth = getDepth(0.9, DEFAULT_BATHYMETRY, 0);
        expect(depth).toBe(DEFAULT_BATHYMETRY.deepDepth);
      });

      it('returns shore depth at shore (progress=1)', () => {
        // At shore, away from peak, should be shore depth
        const depth = getDepth(0.9, DEFAULT_BATHYMETRY, 1);
        expect(depth).toBe(DEFAULT_BATHYMETRY.shoreDepth);
      });

      it('gets shallower as progress increases', () => {
        const depthHorizon = getDepth(0.5, DEFAULT_BATHYMETRY, 0);
        const depthMid = getDepth(0.5, DEFAULT_BATHYMETRY, 0.5);
        const depthShore = getDepth(0.5, DEFAULT_BATHYMETRY, 1);

        expect(depthHorizon).toBeGreaterThan(depthMid);
        expect(depthMid).toBeGreaterThan(depthShore);
      });
    });

    describe('X-axis (peak) behavior', () => {
      it('is shallowest at peak X position', () => {
        const progress = 0.7; // somewhere close to shore
        const depthAtPeak = getDepth(0.4, DEFAULT_BATHYMETRY, progress);
        const depthAwayFromPeak = getDepth(0.9, DEFAULT_BATHYMETRY, progress);

        expect(depthAtPeak).toBeLessThan(depthAwayFromPeak);
      });

      it('peak effect is symmetric around peakX', () => {
        // Test at progress=0.7 which is past the sandbar (only point/peak affects depth here)
        const progress = 0.7;
        // Test symmetry at equal distances from peak (0.35)
        const depthLeft = getDepth(0.25, DEFAULT_BATHYMETRY, progress); // 0.1 left of peak
        const depthRight = getDepth(0.45, DEFAULT_BATHYMETRY, progress); // 0.1 right of peak
        expect(depthLeft).toBeCloseTo(depthRight, 5);
      });

      it('peak effect diminishes with distance from peak', () => {
        const progress = 0.6;
        const depthAtPeak = getDepth(0.4, DEFAULT_BATHYMETRY, progress);
        const depthNearPeak = getDepth(0.5, DEFAULT_BATHYMETRY, progress);
        const depthFarFromPeak = getDepth(0.9, DEFAULT_BATHYMETRY, progress);

        expect(depthAtPeak).toBeLessThan(depthNearPeak);
        expect(depthNearPeak).toBeLessThan(depthFarFromPeak);
      });
    });

    describe('2D combined behavior', () => {
      it('shallowest point is at peak+shore', () => {
        const depthPeakShore = getDepth(0.4, DEFAULT_BATHYMETRY, 1);
        const depthPeakHorizon = getDepth(0.4, DEFAULT_BATHYMETRY, 0);
        const depthEdgeShore = getDepth(0.9, DEFAULT_BATHYMETRY, 1);

        expect(depthPeakShore).toBeLessThan(depthPeakHorizon);
        expect(depthPeakShore).toBeLessThan(depthEdgeShore);
      });

      it('never returns negative depth', () => {
        // Even at extreme shallow point
        const depth = getDepth(0.4, DEFAULT_BATHYMETRY, 1);
        expect(depth).toBeGreaterThan(0);
      });
    });
  });

  describe('getMinDepth', () => {
    it('returns shore depth from config', () => {
      expect(getMinDepth()).toBe(DEFAULT_BATHYMETRY.shoreDepth);
    });

    it('accepts custom config', () => {
      const customConfig = { ...DEFAULT_BATHYMETRY, shoreDepth: 1 };
      expect(getMinDepth(customConfig)).toBe(1);
    });
  });

  describe('getPeakX', () => {
    it('returns peak x position from config', () => {
      expect(getPeakX()).toBe(DEFAULT_BATHYMETRY.peakX);
    });

    it('accepts custom config', () => {
      const customConfig = { ...DEFAULT_BATHYMETRY, peakX: 0.6 };
      expect(getPeakX(customConfig)).toBe(0.6);
    });
  });

  describe('shouldBreak', () => {
    it('returns true when wave height exceeds 78% of depth', () => {
      // depth = 2m, wave height > 1.56m should break
      expect(shouldBreak(1.6, 2)).toBe(true);
    });

    it('returns false when wave height is below threshold', () => {
      // depth = 2m, wave height < 1.56m should not break
      expect(shouldBreak(1.5, 2)).toBe(false);
    });

    it('breaks larger waves in deeper water', () => {
      // depth = 10m, threshold = 7.8m
      expect(shouldBreak(8, 10)).toBe(true);
      expect(shouldBreak(7, 10)).toBe(false);
    });

    it('small waves dont break even in shallow water', () => {
      // depth = 2m, threshold = 1.56m
      // Very small wave (0.5m) should not break
      expect(shouldBreak(0.5, 2)).toBe(false);
    });
  });

  describe('amplitudeToHeight', () => {
    it('converts amplitude 1.0 to max height', () => {
      expect(amplitudeToHeight(1.0)).toBe(3);
    });

    it('converts amplitude 0 to 0 height', () => {
      expect(amplitudeToHeight(0)).toBe(0);
    });

    it('converts amplitude 0.5 to half max height', () => {
      expect(amplitudeToHeight(0.5)).toBe(1.5);
    });

    it('scales linearly', () => {
      expect(amplitudeToHeight(0.25)).toBe(0.75);
      expect(amplitudeToHeight(0.75)).toBe(2.25);
    });
  });

  describe('depth matrix snapshot', () => {
    // This test captures the expected depth values at a 5x5 grid
    // If the bathymetry shape changes, update snapshot with: npx vitest run -u
    it('matches expected depth matrix', () => {
      const gridSize = 5;
      const matrix = [];

      for (let py = 0; py < gridSize; py++) {
        const row = [];
        const progress = py / (gridSize - 1); // 0, 0.25, 0.5, 0.75, 1
        for (let px = 0; px < gridSize; px++) {
          const x = px / (gridSize - 1); // 0, 0.25, 0.5, 0.75, 1
          const depth = getDepth(x, DEFAULT_BATHYMETRY, progress);
          row.push(Math.round(depth * 10) / 10); // Round to 1 decimal
        }
        matrix.push(row);
      }

      // Uses vitest snapshot - run with -u flag to update
      expect(matrix).toMatchSnapshot();
    });

    it('point is shallower than surrounding areas near shore', () => {
      const progress = 0.9; // Near shore
      const depthAtPeak = getDepth(0.4, DEFAULT_BATHYMETRY, progress);
      const depthAway = getDepth(0.8, DEFAULT_BATHYMETRY, progress);

      expect(depthAtPeak).toBeLessThan(depthAway);
    });

    it('point effect diminishes toward horizon', () => {
      const depthAtPeakShore = getDepth(0.4, DEFAULT_BATHYMETRY, 1.0);
      const depthAtPeakMid = getDepth(0.4, DEFAULT_BATHYMETRY, 0.5);
      const depthAtPeakHorizon = getDepth(0.4, DEFAULT_BATHYMETRY, 0.0);

      // At horizon, no point effect
      expect(depthAtPeakHorizon).toBe(DEFAULT_BATHYMETRY.deepDepth);
      // Near shore, point makes it shallower
      expect(depthAtPeakShore).toBeLessThan(depthAtPeakMid);
    });
  });
});
