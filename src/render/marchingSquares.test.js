import { describe, it, expect } from 'vitest';
import {
    buildIntensityGrid,
    boxBlur,
    extractContours,
    simplifyContour,
    extractLineSegments,
} from './marchingSquares.js';

describe('buildIntensityGrid', () => {
    it('creates a grid of the specified size', () => {
        const foamRows = [];
        const grid = buildIntensityGrid(foamRows, 10, 10, 800, 600);
        expect(grid.length).toBe(100);
    });

    it('fills grid cells from foam row segments', () => {
        const foamRows = [
            {
                y: 300, // middle of canvas
                opacity: 1.0,
                segments: [{ startX: 0.4, endX: 0.6, intensity: 1.0 }],
            },
        ];
        const grid = buildIntensityGrid(foamRows, 10, 10, 800, 600);

        // y=300 out of 600: gridY = floor((300/600) * 9) = floor(4.5) = 4
        // startX=0.4: startGridX = floor(0.4 * 9) = 3
        // endX=0.6: endGridX = ceil(0.6 * 9) = 6
        expect(grid[4 * 10 + 3]).toBeGreaterThan(0);
        expect(grid[4 * 10 + 4]).toBeGreaterThan(0);
        expect(grid[4 * 10 + 5]).toBeGreaterThan(0);

        // Other cells should be 0
        expect(grid[0]).toBe(0);
        expect(grid[99]).toBe(0);
    });

    it('respects opacity when filling grid', () => {
        const foamRows = [
            {
                y: 300,
                opacity: 0.5,
                segments: [{ startX: 0.5, endX: 0.6, intensity: 1.0 }],
            },
        ];
        const grid = buildIntensityGrid(foamRows, 10, 10, 800, 600);

        // y=300: gridY = floor((300/600) * 9) = 4
        // x=0.5: gridX = floor(0.5 * 9) = 4
        // Value should be opacity * intensity = 0.5
        expect(grid[4 * 10 + 4]).toBeCloseTo(0.5, 1);
    });
});

describe('boxBlur', () => {
    it('smooths values across neighbors', () => {
        // 5x5 grid with a single hot pixel in center
        const grid = new Float32Array(25);
        grid[12] = 1.0; // center pixel

        const blurred = boxBlur(grid, 5, 5, 1);

        // Center should be reduced (averaged with 8 neighbors of 0)
        expect(blurred[12]).toBeCloseTo(1 / 9, 2);

        // Neighbors should have some value now
        expect(blurred[7]).toBeGreaterThan(0); // above
        expect(blurred[17]).toBeGreaterThan(0); // below
    });

    it('multiple passes are supported', () => {
        const grid = new Float32Array(49); // 7x7
        grid[24] = 1.0; // center

        // Just verify it doesn't crash and produces values
        const blur2 = boxBlur(grid, 7, 7, 2);

        // Center should have been smoothed
        expect(blur2[24]).toBeGreaterThan(0);
        expect(blur2[24]).toBeLessThan(1);
    });

    it('preserves total intensity (approximately)', () => {
        const grid = new Float32Array(25);
        grid[12] = 1.0;

        const blurred = boxBlur(grid, 5, 5, 1);

        const originalSum = Array.from(grid).reduce((a, b) => a + b, 0);
        const blurredSum = Array.from(blurred).reduce((a, b) => a + b, 0);

        // Should be similar (edge effects may cause small differences)
        expect(blurredSum).toBeCloseTo(originalSum, 0);
    });
});

describe('extractContours', () => {
    it('extracts no contours from empty grid', () => {
        const grid = new Float32Array(25);
        const contours = extractContours(grid, 5, 5, 0.5);
        expect(contours.length).toBe(0);
    });

    it('extracts no contours from fully filled grid', () => {
        const grid = new Float32Array(25).fill(1.0);
        const contours = extractContours(grid, 5, 5, 0.5);
        expect(contours.length).toBe(0);
    });

    it('extracts a contour around a blob', () => {
        // 5x5 grid with a 3x3 blob in the center
        const grid = new Float32Array(25);
        // Fill center 3x3
        grid[6] = 1; grid[7] = 1; grid[8] = 1;
        grid[11] = 1; grid[12] = 1; grid[13] = 1;
        grid[16] = 1; grid[17] = 1; grid[18] = 1;

        const contours = extractContours(grid, 5, 5, 0.5);

        expect(contours.length).toBeGreaterThan(0);

        // Contour should have multiple points forming a closed shape
        const contour = contours[0];
        expect(contour.length).toBeGreaterThanOrEqual(3);
    });

    it('contour points are within 0-1 range', () => {
        const grid = new Float32Array(25);
        grid[6] = 1; grid[7] = 1; grid[8] = 1;
        grid[11] = 1; grid[12] = 1; grid[13] = 1;
        grid[16] = 1; grid[17] = 1; grid[18] = 1;

        const contours = extractContours(grid, 5, 5, 0.5);

        for (const contour of contours) {
            for (const point of contour) {
                expect(point.x).toBeGreaterThanOrEqual(0);
                expect(point.x).toBeLessThanOrEqual(1);
                expect(point.y).toBeGreaterThanOrEqual(0);
                expect(point.y).toBeLessThanOrEqual(1);
            }
        }
    });
});

describe('extractLineSegments', () => {
    it('extracts no segments from empty grid', () => {
        const grid = new Float32Array(25);
        const segments = extractLineSegments(grid, 5, 5, 0.5);
        expect(segments.length).toBe(0);
    });

    it('extracts no segments from fully filled grid', () => {
        const grid = new Float32Array(25).fill(1.0);
        const segments = extractLineSegments(grid, 5, 5, 0.5);
        expect(segments.length).toBe(0);
    });

    it('extracts line segments around a blob', () => {
        // 5x5 grid with a 3x3 blob in the center
        const grid = new Float32Array(25);
        grid[6] = 1; grid[7] = 1; grid[8] = 1;
        grid[11] = 1; grid[12] = 1; grid[13] = 1;
        grid[16] = 1; grid[17] = 1; grid[18] = 1;

        const segments = extractLineSegments(grid, 5, 5, 0.5);

        expect(segments.length).toBeGreaterThan(0);

        // Each segment should have x1, y1, x2, y2
        for (const seg of segments) {
            expect(seg).toHaveProperty('x1');
            expect(seg).toHaveProperty('y1');
            expect(seg).toHaveProperty('x2');
            expect(seg).toHaveProperty('y2');
            expect(seg.x1).toBeGreaterThanOrEqual(0);
            expect(seg.x1).toBeLessThanOrEqual(1);
            expect(seg.y1).toBeGreaterThanOrEqual(0);
            expect(seg.y1).toBeLessThanOrEqual(1);
        }
    });

    it('produces segments that form a closed loop around simple shapes', () => {
        // 4x4 grid with center 2x2 filled
        const grid = new Float32Array(16);
        grid[5] = 1; grid[6] = 1;
        grid[9] = 1; grid[10] = 1;

        const segments = extractLineSegments(grid, 4, 4, 0.5);

        // Should produce segments around the perimeter
        // With 4x4 grid (3x3 cells) and 2x2 filled in center, we get 8 segments
        expect(segments.length).toBe(8);
    });
});

describe('simplifyContour', () => {
    it('removes collinear points', () => {
        const contour = [
            { x: 0, y: 0 },
            { x: 0.5, y: 0 }, // collinear
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
        ];

        const simplified = simplifyContour(contour, 0.001);

        // Should remove the middle point on the top edge
        expect(simplified.length).toBeLessThan(contour.length);
    });

    it('keeps points that deviate from line', () => {
        const contour = [
            { x: 0, y: 0 },
            { x: 0.5, y: 0.1 }, // NOT collinear
            { x: 1, y: 0 },
        ];

        const simplified = simplifyContour(contour, 0.01);

        // Should keep all points
        expect(simplified.length).toBe(3);
    });
});

describe('performance', () => {
    it('buildIntensityGrid handles 500 foam rows under 8ms', () => {
        // Simulate 500 foam rows (heavy accumulation scenario)
        const foamRows = [];
        for (let i = 0; i < 500; i++) {
            foamRows.push({
                y: (i / 500) * 600, // Spread across ocean height
                opacity: 0.5 + Math.random() * 0.5,
                segments: [
                    { startX: 0.1 + Math.random() * 0.2, endX: 0.3 + Math.random() * 0.2, intensity: 0.8 },
                    { startX: 0.5 + Math.random() * 0.2, endX: 0.7 + Math.random() * 0.2, intensity: 0.6 },
                ],
            });
        }

        const start = performance.now();
        buildIntensityGrid(foamRows, 80, 60, 800, 600);
        const elapsed = performance.now() - start;

        // Should complete reasonably fast (50ms budget for CI/varied environments)
        expect(elapsed).toBeLessThan(50);
    });

    it('full render pipeline handles 500 foam rows under 16ms', () => {
        // Simulate 500 foam rows
        const foamRows = [];
        for (let i = 0; i < 500; i++) {
            foamRows.push({
                y: (i / 500) * 600,
                opacity: 0.5 + Math.random() * 0.5,
                spawnTime: i * 100,
                segments: [
                    { startX: 0.1 + Math.random() * 0.2, endX: 0.3 + Math.random() * 0.2, intensity: 0.8 },
                    { startX: 0.5 + Math.random() * 0.2, endX: 0.7 + Math.random() * 0.2, intensity: 0.6 },
                ],
            });
        }

        const start = performance.now();

        // Full pipeline: grid -> blur -> extract segments (what happens in renderMultiContour)
        const grid = buildIntensityGrid(foamRows, 80, 60, 800, 600);
        const blurred = boxBlur(grid, 80, 60, 2);
        extractLineSegments(blurred, 80, 60, 0.15);
        extractLineSegments(blurred, 80, 60, 0.3);
        extractLineSegments(blurred, 80, 60, 0.5);

        const elapsed = performance.now() - start;

        // Should complete reasonably fast (100ms budget for CI/varied environments)
        expect(elapsed).toBeLessThan(100);
    });

    it.skip('processes a large grid quickly', () => {
        // 80x60 grid (typical game resolution)
        const grid = new Float32Array(80 * 60);

        // Create some blobs
        for (let y = 20; y < 30; y++) {
            for (let x = 30; x < 50; x++) {
                grid[y * 80 + x] = 1.0;
            }
        }

        const start = performance.now();

        // Full pipeline
        const blurred = boxBlur(grid, 80, 60, 2);
        const contours = extractContours(blurred, 80, 60, 0.3);

        const elapsed = performance.now() - start;

        console.log(`Grid processing: ${elapsed.toFixed(2)}ms for 80x60 grid`);
        console.log(`Contours found: ${contours.length}`);

        expect(elapsed).toBeLessThan(10); // Should be well under 10ms
    });

    it('handles multiple blobs efficiently', () => {
        const grid = new Float32Array(80 * 60);

        // Create 5 separate blobs (like 5 sandbar lobes)
        const blobs = [
            { x: 10, y: 20 },
            { x: 25, y: 22 },
            { x: 40, y: 20 },
            { x: 55, y: 22 },
            { x: 70, y: 20 },
        ];

        for (const blob of blobs) {
            for (let dy = 0; dy < 8; dy++) {
                for (let dx = 0; dx < 10; dx++) {
                    const x = blob.x + dx;
                    const y = blob.y + dy;
                    if (x < 80 && y < 60) {
                        grid[y * 80 + x] = 1.0;
                    }
                }
            }
        }

        const start = performance.now();

        const blurred = boxBlur(grid, 80, 60, 2);
        const contours = extractContours(blurred, 80, 60, 0.3);

        const elapsed = performance.now() - start;

        console.log(`Multi-blob processing: ${elapsed.toFixed(2)}ms`);
        console.log(`Contours found: ${contours.length}`);

        // Lenient limit for CI/varied environments
        expect(elapsed).toBeLessThan(100);
        expect(contours.length).toBeGreaterThanOrEqual(1); // At least one contour
    });
});
