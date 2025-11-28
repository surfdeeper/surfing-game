import { describe, it, expect, beforeEach, vi } from 'vitest';
import { depthToColor, buildBathymetryCache, createBathymetryCacheManager } from './bathymetryRenderer.js';
import { DEFAULT_BATHYMETRY } from '../state/bathymetryModel.js';

describe('bathymetryRenderer', () => {
    describe('depthToColor', () => {
        it('returns sandy tan color for shallow water (depth ~0)', () => {
            const { r, g, b } = depthToColor(0.1, 15);
            // Shallow = sandy tan (high r/g, low b)
            expect(r).toBeGreaterThan(200);
            expect(g).toBeGreaterThan(160);
            expect(b).toBeGreaterThan(80);
        });

        it('returns dark brown color for deep water', () => {
            const { r, g, b } = depthToColor(30, 15);
            // Deep = dark brown (low r/g/b)
            expect(r).toBeLessThan(80);
            expect(g).toBeLessThan(60);
            expect(b).toBeLessThan(40);
        });

        it('returns intermediate color for medium depth', () => {
            const shallow = depthToColor(1, 15);
            const deep = depthToColor(30, 15);
            const medium = depthToColor(8, 15);

            // Medium should be between shallow and deep
            expect(medium.r).toBeLessThan(shallow.r);
            expect(medium.r).toBeGreaterThan(deep.r);
        });

        it('clamps at colorScaleDepth (no darker past threshold)', () => {
            const atThreshold = depthToColor(15, 15);
            const pastThreshold = depthToColor(30, 15);

            // Colors should be the same past threshold
            expect(atThreshold.r).toBe(pastThreshold.r);
            expect(atThreshold.g).toBe(pastThreshold.g);
            expect(atThreshold.b).toBe(pastThreshold.b);
        });

        it('uses sqrt scaling for better shallow visibility', () => {
            // With sqrt scaling, mid-depth should be lighter than linear interpolation
            // At depth=3.75 (1/4 of 15), sqrt(0.25)=0.5, so color should be at midpoint
            const { r } = depthToColor(3.75, 15);
            // Linear would give: 220 - 160*0.25 = 180
            // Sqrt gives: 220 - 160*0.5 = 140
            expect(r).toBeCloseTo(140, 0);
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
            const createCallCount = document.createElement.mock.calls.length;

            manager.get(800, 0, 600, DEFAULT_BATHYMETRY);

            // Should not create another canvas
            expect(document.createElement).toHaveBeenCalledTimes(createCallCount);
        });

        it('rebuilds cache when width changes', () => {
            const manager = createBathymetryCacheManager();

            manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
            const createCallCount = document.createElement.mock.calls.length;

            manager.get(1024, 0, 600, DEFAULT_BATHYMETRY);

            // Should create another canvas
            expect(document.createElement).toHaveBeenCalledTimes(createCallCount + 1);
        });

        it('rebuilds cache when height changes', () => {
            const manager = createBathymetryCacheManager();

            manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
            const createCallCount = document.createElement.mock.calls.length;

            manager.get(800, 0, 768, DEFAULT_BATHYMETRY);

            // Should create another canvas
            expect(document.createElement).toHaveBeenCalledTimes(createCallCount + 1);
        });

        it('invalidate() forces rebuild on next get()', () => {
            const manager = createBathymetryCacheManager();

            manager.get(800, 0, 600, DEFAULT_BATHYMETRY);
            const createCallCount = document.createElement.mock.calls.length;

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
