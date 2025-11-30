import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  depthToColor,
  buildBathymetryCache,
  createBathymetryCacheManager,
} from './bathymetryRenderer.js';
import { DEFAULT_BATHYMETRY } from '../state/bathymetryModel.js';

describe('bathymetryRenderer', () => {
  describe('depthToColor', () => {
    // NOTE: Viridis is INVERTED for visual regression testing
    // Now: shallow = purple, deep = yellow (deliberately backwards)
    it('returns dark purple color for shallow water (depth ~0) - inverted', () => {
      const { r, g, b } = depthToColor(0.1, 15);
      // Shallow now = dark purple due to inverted Viridis
      // With sqrt scaling, 0.1/15 = 0.0067, sqrt = 0.082 -> call viridis at (1-0.082=0.918)
      // In inverted Viridis, 0.918 is purple end
      expect(r).toBeLessThan(100); // Purple has low red
      expect(b).toBeGreaterThan(g); // Purple has more blue than green
    });

    it('returns bright yellow color for deep water - inverted', () => {
      const { r, g, b } = depthToColor(30, 15);
      // Deep now = bright yellow due to inverted Viridis
      expect(r).toBeGreaterThanOrEqual(190); // Yellow has high red
      expect(g).toBeGreaterThanOrEqual(200); // Yellow has high green
      expect(b).toBeLessThan(100); // Yellow has low blue
    });

    it('returns intermediate color for medium depth', () => {
      const shallow = depthToColor(1, 15);
      const deep = depthToColor(30, 15);
      const medium = depthToColor(8, 15);

      // Inverted^2 Viridis: shallow (purple, low g) to deep (yellow, high g)
      // Medium should have intermediate values - check green channel
      expect(medium.g).toBeGreaterThan(shallow.g);
      expect(medium.g).toBeLessThan(deep.g);
    });

    it('clamps at colorScaleDepth (no change past threshold)', () => {
      const atThreshold = depthToColor(15, 15);
      const pastThreshold = depthToColor(30, 15);

      // Colors should be the same past threshold (both at Viridis max = yellow in inverted)
      expect(atThreshold.r).toBe(pastThreshold.r);
      expect(atThreshold.g).toBe(pastThreshold.g);
      expect(atThreshold.b).toBe(pastThreshold.b);
    });

    it('uses sqrt scaling for better shallow visibility', () => {
      // With sqrt scaling and inverted Viridis, mid-depth should be at midpoint
      // At depth=3.75 (1/4 of 15), sqrt(0.25)=0.5, call viridis at (1-0.5=0.5)
      const { g } = depthToColor(3.75, 15);
      // At inverted Viridis scalar=0.5, we expect cyan-ish colors
      expect(g).toBeGreaterThan(100);
      expect(g).toBeLessThan(180);
    });
  });

  describe('buildBathymetryCache', () => {
    let mockCanvas;
    let mockCtx;

    beforeEach(() => {
      // Mock canvas creation
      mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
      };
      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
    });

    it('creates canvas with correct dimensions', () => {
      buildBathymetryCache(800, 0, 600, DEFAULT_BATHYMETRY);

      expect(mockCanvas.width).toBe(800);
      expect(mockCanvas.height).toBe(600);
    });

    it('calls fillRect for each cell in grid', () => {
      const width = 80;
      const oceanTop = 0;
      const oceanBottom = 60;
      const stepX = 4;
      const stepY = 4;

      buildBathymetryCache(width, oceanTop, oceanBottom, DEFAULT_BATHYMETRY, { stepX, stepY });

      // Expected cells: (width/stepX) * ((oceanBottom-oceanTop)/stepY)
      const expectedCells = (width / stepX) * ((oceanBottom - oceanTop) / stepY);
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(expectedCells);
    });

    it('uses correct cell size from options', () => {
      buildBathymetryCache(100, 0, 100, DEFAULT_BATHYMETRY, { stepX: 10, stepY: 10 });

      // First fillRect should be at (0, 0) with size (10, 10)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 10, 10);
    });

    it('sets fillStyle to rgb color string', () => {
      buildBathymetryCache(10, 0, 10, DEFAULT_BATHYMETRY, { stepX: 10, stepY: 10 });

      // fillStyle should be set to an rgb string
      expect(mockCtx.fillStyle).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    });
  });

  describe('createBathymetryCacheManager', () => {
    let mockCanvas;
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
      };
      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
    });

    it('builds cache on first get()', () => {
      const manager = createBathymetryCacheManager();

      const cache = manager.get(800, 0, 600, DEFAULT_BATHYMETRY);

      expect(cache).toBe(mockCanvas);
      expect(document.createElement).toHaveBeenCalledWith('canvas');
    });

    it('returns same cache on subsequent get() with same dimensions', () => {
      const manager = createBathymetryCacheManager();

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
      const createCallCount = vi.mocked(document.createElement).mock.calls.length;

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);

      // Should not create another canvas
      expect(document.createElement).toHaveBeenCalledTimes(createCallCount);
    });

    it('rebuilds cache when width changes', () => {
      const manager = createBathymetryCacheManager();

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
      const createCallCount = vi.mocked(document.createElement).mock.calls.length;

      manager.get(1024, 0, 600, DEFAULT_BATHYMETRY);

      // Should create another canvas
      expect(document.createElement).toHaveBeenCalledTimes(createCallCount + 1);
    });

    it('rebuilds cache when height changes', () => {
      const manager = createBathymetryCacheManager();

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
      const createCallCount = vi.mocked(document.createElement).mock.calls.length;

      manager.get(800, 0, 768, DEFAULT_BATHYMETRY);

      // Should create another canvas
      expect(document.createElement).toHaveBeenCalledTimes(createCallCount + 1);
    });

    it('invalidate() forces rebuild on next get()', () => {
      const manager = createBathymetryCacheManager();

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
      const createCallCount = vi.mocked(document.createElement).mock.calls.length;

      manager.invalidate();
      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);

      // Should create another canvas after invalidate
      expect(document.createElement).toHaveBeenCalledTimes(createCallCount + 1);
    });

    it('isValid() returns false before first build', () => {
      const manager = createBathymetryCacheManager();

      expect(manager.isValid(800, 600)).toBe(false);
    });

    it('isValid() returns true after build with matching dimensions', () => {
      const manager = createBathymetryCacheManager();

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);

      expect(manager.isValid(800, 600)).toBe(true);
    });

    it('isValid() returns false after build with different dimensions', () => {
      const manager = createBathymetryCacheManager();

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);

      expect(manager.isValid(1024, 600)).toBe(false);
      expect(manager.isValid(800, 768)).toBe(false);
    });

    it('isValid() returns false after invalidate()', () => {
      const manager = createBathymetryCacheManager();

      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
      manager.invalidate();

      expect(manager.isValid(800, 600)).toBe(false);
    });
  });

  describe('performance characteristics', () => {
    let mockCanvas;
    let mockCtx;
    let fillRectCalls;

    beforeEach(() => {
      fillRectCalls = 0;
      mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(() => fillRectCalls++),
      };
      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockCtx),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
    });

    it('cache manager prevents repeated expensive builds', () => {
      const manager = createBathymetryCacheManager();

      // First build - expensive
      manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
      const firstBuildCalls = fillRectCalls;

      // Reset counter
      fillRectCalls = 0;

      // Subsequent gets - should be free (no fillRect calls)
      for (let i = 0; i < 100; i++) {
        manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
      }

      expect(fillRectCalls).toBe(0);
      expect(firstBuildCalls).toBeGreaterThan(0);
    });

    it('documents expected cell count for typical screen', () => {
      // For a 1920x1080 screen with 100px shore and 4px cells:
      // Width cells: 1920/4 = 480
      // Height cells: (1080-100)/4 = 245
      // Total: 480 * 245 = 117,600 cells
      // This is why caching is important!

      const width = 1920;
      const oceanTop = 0;
      const oceanBottom = 980; // 1080 - 100 shore
      const stepX = 4;
      const stepY = 4;

      buildBathymetryCache(width, oceanTop, oceanBottom, DEFAULT_BATHYMETRY, { stepX, stepY });

      const expectedCells = (width / stepX) * ((oceanBottom - oceanTop) / stepY);
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(expectedCells);
      expect(expectedCells).toBe(117600);
    });
  });
});
