/**
 * Marching Squares implementation for extracting smooth contours from a 2D grid.
 *
 * The algorithm:
 * 1. For each cell (2x2 grid points), classify corners as above/below threshold
 * 2. Look up the edge configuration (16 possible cases)
 * 3. Interpolate edge crossing points for smooth contours
 * 4. Connect edges to form closed polygons
 */

// Edge lookup table for marching squares
// Each case maps to which edges have crossings: [top, right, bottom, left]
// Values: 0 = no crossing, 1 = crossing
const EDGE_TABLE = [
    [],           // 0: all below
    [3, 0],       // 1: BL above
    [0, 1],       // 2: BR above
    [3, 1],       // 3: BL, BR above
    [1, 2],       // 4: TR above
    [3, 0, 1, 2], // 5: BL, TR above (saddle)
    [0, 2],       // 6: BR, TR above
    [3, 2],       // 7: BL, BR, TR above
    [2, 3],       // 8: TL above
    [2, 0],       // 9: BL, TL above
    [0, 1, 2, 3], // 10: BR, TL above (saddle)
    [2, 1],       // 11: BL, BR, TL above
    [1, 3],       // 12: TR, TL above
    [1, 0],       // 13: BL, TR, TL above
    [0, 3],       // 14: BR, TR, TL above
    [],           // 15: all above
];

/**
 * Build an intensity grid from foam row data
 * @param {Array} foamRows - Array of {y, opacity, segments: [{startX, endX, intensity}]}
 * @param {number} gridW - Grid width
 * @param {number} gridH - Grid height
 * @param {number} canvasW - Canvas width in pixels
 * @param {number} canvasH - Canvas height in pixels (ocean area only)
 * @returns {Float32Array} Intensity grid (0-1 values)
 */
export function buildIntensityGrid(foamRows, gridW, gridH, canvasW, canvasH) {
    const grid = new Float32Array(gridW * gridH);

    for (const row of foamRows) {
        if (row.opacity <= 0) continue;

        // Map Y position to grid row
        const gridY = Math.floor((row.y / canvasH) * (gridH - 1));
        if (gridY < 0 || gridY >= gridH) continue;

        for (const seg of row.segments) {
            // Map X positions to grid columns
            const startGridX = Math.floor(seg.startX * (gridW - 1));
            const endGridX = Math.ceil(seg.endX * (gridW - 1));

            for (let gx = startGridX; gx <= endGridX && gx < gridW; gx++) {
                if (gx < 0) continue;
                const idx = gridY * gridW + gx;
                // Accumulate intensity (opacity * segment intensity)
                const intensity = row.opacity * (seg.intensity || 0.5);
                grid[idx] = Math.max(grid[idx], intensity);
            }
        }
    }

    return grid;
}

/**
 * Option A: Build intensity grid with expanding segment bounds over time
 * As foam ages, the segment bounds expand outward while core intensity fades
 * This creates the effect of foam dispersing - outer contours expand, inner collapse
 *
 * @param {Array} foamRows - Array of {y, opacity, spawnTime, segments: [{startX, endX, intensity}]}
 * @param {number} gridW - Grid width
 * @param {number} gridH - Grid height
 * @param {number} canvasW - Canvas width in pixels
 * @param {number} canvasH - Canvas height in pixels (ocean area only)
 * @param {number} gameTime - Current game time in ms
 * @returns {Float32Array} Intensity grid (0-1 values)
 */
export function buildIntensityGridOptionA(foamRows, gridW, gridH, canvasW, canvasH, gameTime) {
    const grid = new Float32Array(gridW * gridH);

    for (const row of foamRows) {
        if (row.opacity <= 0) continue;

        // Calculate age of this foam row
        const age = row.spawnTime ? (gameTime - row.spawnTime) / 1000 : 0;

        // Dispersion factor: foam expands 15% per second
        const dispersionFactor = 1 + age * 0.15;

        // Core intensity fades faster than opacity (concentrated core dissipates)
        const coreFade = Math.max(0, 1 - age / 6); // Core fades over 6 seconds

        // Map Y position to grid row
        const gridY = Math.floor((row.y / canvasH) * (gridH - 1));
        if (gridY < 0 || gridY >= gridH) continue;

        for (const seg of row.segments) {
            // Original segment width and center
            const segWidth = seg.endX - seg.startX;
            const segCenter = (seg.startX + seg.endX) / 2;

            // Expanded segment bounds
            const expandedWidth = segWidth * dispersionFactor;
            const expandedStartX = segCenter - expandedWidth / 2;
            const expandedEndX = segCenter + expandedWidth / 2;

            // Map X positions to grid columns
            const startGridX = Math.floor(Math.max(0, expandedStartX) * (gridW - 1));
            const endGridX = Math.ceil(Math.min(1, expandedEndX) * (gridW - 1));

            for (let gx = startGridX; gx <= endGridX && gx < gridW; gx++) {
                if (gx < 0) continue;

                // Calculate normalized position within expanded segment
                const normalizedX = gx / (gridW - 1);
                const distFromCenter = Math.abs(normalizedX - segCenter);
                const originalHalfWidth = segWidth / 2;

                // Intensity falls off from center
                // Inside original bounds: full intensity * coreFade
                // Outside original bounds: reduced intensity (halo effect)
                let intensity;
                if (distFromCenter <= originalHalfWidth) {
                    // Core region - fades with coreFade
                    intensity = row.opacity * (seg.intensity || 0.5) * coreFade;
                } else {
                    // Halo region - gaussian-like falloff
                    const haloProgress = (distFromCenter - originalHalfWidth) / (expandedWidth / 2 - originalHalfWidth);
                    const haloIntensity = Math.max(0, 0.4 * (1 - haloProgress * haloProgress));
                    intensity = row.opacity * haloIntensity;
                }

                const idx = gridY * gridW + gx;
                grid[idx] = Math.max(grid[idx], intensity);
            }
        }
    }

    return grid;
}

/**
 * Option B: Build intensity grid with age-based blur
 * Uses more blur passes for older foam, causing natural expansion
 * Simpler than Option A but affects all foam uniformly
 *
 * @param {Array} foamRows - Array of {y, opacity, spawnTime, segments: [{startX, endX, intensity}]}
 * @param {number} gridW - Grid width
 * @param {number} gridH - Grid height
 * @param {number} canvasW - Canvas width in pixels
 * @param {number} canvasH - Canvas height in pixels (ocean area only)
 * @param {number} gameTime - Current game time in ms
 * @returns {{grid: Float32Array, blurPasses: number}} Grid and recommended blur passes
 */
export function buildIntensityGridOptionB(foamRows, gridW, gridH, canvasW, canvasH, gameTime) {
    const grid = new Float32Array(gridW * gridH);

    // Calculate average age of all foam rows
    let totalAge = 0;
    let count = 0;

    for (const row of foamRows) {
        if (row.opacity <= 0 || !row.spawnTime) continue;
        totalAge += (gameTime - row.spawnTime) / 1000;
        count++;
    }

    const avgAge = count > 0 ? totalAge / count : 0;

    // More blur passes as foam ages (base 2 + up to 6 more)
    const dynamicBlurPasses = Math.min(8, 2 + Math.floor(avgAge * 0.8));

    for (const row of foamRows) {
        if (row.opacity <= 0) continue;

        // Map Y position to grid row
        const gridY = Math.floor((row.y / canvasH) * (gridH - 1));
        if (gridY < 0 || gridY >= gridH) continue;

        for (const seg of row.segments) {
            // Map X positions to grid columns
            const startGridX = Math.floor(seg.startX * (gridW - 1));
            const endGridX = Math.ceil(seg.endX * (gridW - 1));

            for (let gx = startGridX; gx <= endGridX && gx < gridW; gx++) {
                if (gx < 0) continue;
                const idx = gridY * gridW + gx;
                // Accumulate intensity (opacity * segment intensity)
                const intensity = row.opacity * (seg.intensity || 0.5);
                grid[idx] = Math.max(grid[idx], intensity);
            }
        }
    }

    return { grid, blurPasses: dynamicBlurPasses };
}

/**
 * Option C: Build intensity grid with per-row dispersion radius
 * Each foam row tracks its own expansion based on age
 * Most physically accurate - foam spreads and core/halo fade at different rates
 *
 * @param {Array} foamRows - Array of {y, opacity, spawnTime, segments: [{startX, endX, intensity}]}
 * @param {number} gridW - Grid width
 * @param {number} gridH - Grid height
 * @param {number} canvasW - Canvas width in pixels
 * @param {number} canvasH - Canvas height in pixels (ocean area only)
 * @param {number} gameTime - Current game time in ms
 * @returns {Float32Array} Intensity grid (0-1 values)
 */
export function buildIntensityGridOptionC(foamRows, gridW, gridH, canvasW, canvasH, gameTime) {
    const grid = new Float32Array(gridW * gridH);

    for (const row of foamRows) {
        if (row.opacity <= 0) continue;

        // Calculate age-based dispersion properties
        const age = row.spawnTime ? (gameTime - row.spawnTime) / 1000 : 0;

        // Dispersion radius grows over time (starts at 1.0, grows 25% per second)
        const dispersionRadius = 1.0 + age * 0.25;

        // Core intensity fades faster (3 seconds)
        const coreIntensity = Math.max(0, 1 - age / 3);

        // Halo intensity fades slower (6 seconds) but starts weaker
        const haloIntensity = Math.max(0, 0.35 * (1 - age / 6));

        // Map Y position to grid row - also expand in Y direction
        const yExpansion = Math.floor(age * 0.5); // Spread to adjacent Y rows over time
        const baseGridY = Math.floor((row.y / canvasH) * (gridH - 1));

        for (let yOffset = -yExpansion; yOffset <= yExpansion; yOffset++) {
            const gridY = baseGridY + yOffset;
            if (gridY < 0 || gridY >= gridH) continue;

            // Y distance falloff
            const yFalloff = yOffset === 0 ? 1.0 : 0.5 / (Math.abs(yOffset) + 1);

            for (const seg of row.segments) {
                // Original segment dimensions
                const segWidth = seg.endX - seg.startX;
                const segCenter = (seg.startX + seg.endX) / 2;

                // Expanded segment bounds
                const expandedWidth = segWidth * dispersionRadius;
                const expandedStartX = segCenter - expandedWidth / 2;
                const expandedEndX = segCenter + expandedWidth / 2;

                // Map X positions to grid columns
                const startGridX = Math.floor(Math.max(0, expandedStartX) * (gridW - 1));
                const endGridX = Math.ceil(Math.min(1, expandedEndX) * (gridW - 1));

                for (let gx = startGridX; gx <= endGridX && gx < gridW; gx++) {
                    if (gx < 0) continue;

                    // Calculate position within segment
                    const normalizedX = gx / (gridW - 1);
                    const distFromCenter = Math.abs(normalizedX - segCenter);
                    const originalHalfWidth = segWidth / 2;

                    let intensity;
                    if (distFromCenter <= originalHalfWidth) {
                        // Core region
                        intensity = row.opacity * (seg.intensity || 0.5) * coreIntensity * yFalloff;
                    } else {
                        // Halo region - smooth falloff
                        const expandedHalfWidth = expandedWidth / 2;
                        const haloProgress = (distFromCenter - originalHalfWidth) / (expandedHalfWidth - originalHalfWidth);
                        const falloff = Math.max(0, 1 - haloProgress);
                        intensity = row.opacity * haloIntensity * falloff * yFalloff;
                    }

                    const idx = gridY * gridW + gx;
                    grid[idx] = Math.max(grid[idx], intensity);
                }
            }
        }
    }

    return grid;
}

/**
 * Apply box blur to a grid (3x3 kernel)
 * @param {Float32Array} grid - Input grid
 * @param {number} w - Grid width
 * @param {number} h - Grid height
 * @param {number} passes - Number of blur passes (default 1)
 * @returns {Float32Array} Blurred grid
 */
export function boxBlur(grid, w, h, passes = 1) {
    let src = grid;
    let dst = new Float32Array(w * h);

    for (let pass = 0; pass < passes; pass++) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let sum = 0;
                let count = 0;

                // 3x3 kernel
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            sum += src[ny * w + nx];
                            count++;
                        }
                    }
                }

                dst[y * w + x] = sum / count;
            }
        }

        // Swap buffers for next pass
        if (pass < passes - 1) {
            const tmp = src;
            src = dst;
            dst = tmp;
        }
    }

    return dst;
}

/**
 * Find the interpolated crossing point on an edge
 */
function interpolateEdge(v1, v2, threshold) {
    if (Math.abs(v2 - v1) < 0.0001) return 0.5;
    return (threshold - v1) / (v2 - v1);
}

/**
 * Extract contours from a grid using marching squares
 * @param {Float32Array} grid - Intensity grid
 * @param {number} w - Grid width
 * @param {number} h - Grid height
 * @param {number} threshold - Intensity threshold for contour
 * @returns {Array} Array of contours, each contour is array of {x, y} points (0-1 normalized)
 */
export function extractContours(grid, w, h, threshold) {
    const contours = [];
    const visited = new Set();

    // For each cell, find edge crossings
    for (let cy = 0; cy < h - 1; cy++) {
        for (let cx = 0; cx < w - 1; cx++) {
            const cellKey = `${cx},${cy}`;
            if (visited.has(cellKey)) continue;

            // Get corner values
            const tl = grid[cy * w + cx];
            const tr = grid[cy * w + cx + 1];
            const bl = grid[(cy + 1) * w + cx];
            const br = grid[(cy + 1) * w + cx + 1];

            // Classify corners (1 if above threshold, 0 if below)
            const config =
                (tl >= threshold ? 8 : 0) |
                (tr >= threshold ? 4 : 0) |
                (br >= threshold ? 2 : 0) |
                (bl >= threshold ? 1 : 0);

            // Skip empty or full cells
            if (config === 0 || config === 15) continue;

            // Try to trace a contour starting from this cell
            const contour = traceContour(grid, w, h, cx, cy, threshold, visited);
            if (contour.length >= 3) {
                contours.push(contour);
            }
        }
    }

    return contours;
}

/**
 * Trace a single contour starting from a cell
 */
function traceContour(grid, w, h, startCx, startCy, threshold, visited) {
    const contour = [];
    let cx = startCx;
    let cy = startCy;
    let fromEdge = -1; // Which edge we entered from

    const maxIterations = w * h * 2; // Prevent infinite loops
    let iterations = 0;

    while (iterations++ < maxIterations) {
        const cellKey = `${cx},${cy}`;

        // Get corner values
        const tl = grid[cy * w + cx];
        const tr = grid[cy * w + cx + 1];
        const bl = grid[(cy + 1) * w + cx];
        const br = grid[(cy + 1) * w + cx + 1];

        // Classify corners
        const config =
            (tl >= threshold ? 8 : 0) |
            (tr >= threshold ? 4 : 0) |
            (br >= threshold ? 2 : 0) |
            (bl >= threshold ? 1 : 0);

        if (config === 0 || config === 15) break;

        visited.add(cellKey);

        const edges = EDGE_TABLE[config];
        if (edges.length === 0) break;

        // Find exit edge (different from entry edge)
        let exitEdge = -1;
        for (const edge of edges) {
            if (edge !== fromEdge) {
                exitEdge = edge;
                break;
            }
        }

        if (exitEdge === -1) break;

        // Calculate crossing point on exit edge
        let px, py;
        const cellX = cx / (w - 1);
        const cellY = cy / (h - 1);
        const cellW = 1 / (w - 1);
        const cellH = 1 / (h - 1);

        switch (exitEdge) {
            case 0: // Top edge (TL to TR)
                const tTop = interpolateEdge(tl, tr, threshold);
                px = cellX + tTop * cellW;
                py = cellY;
                break;
            case 1: // Right edge (TR to BR)
                const tRight = interpolateEdge(tr, br, threshold);
                px = cellX + cellW;
                py = cellY + tRight * cellH;
                break;
            case 2: // Bottom edge (BL to BR)
                const tBottom = interpolateEdge(bl, br, threshold);
                px = cellX + tBottom * cellW;
                py = cellY + cellH;
                break;
            case 3: // Left edge (TL to BL)
                const tLeft = interpolateEdge(tl, bl, threshold);
                px = cellX;
                py = cellY + tLeft * cellH;
                break;
        }

        contour.push({ x: px, y: py });

        // Move to next cell based on exit edge
        let nextCx = cx;
        let nextCy = cy;
        let nextFromEdge = -1;

        switch (exitEdge) {
            case 0: nextCy = cy - 1; nextFromEdge = 2; break; // Exit top, enter from bottom
            case 1: nextCx = cx + 1; nextFromEdge = 3; break; // Exit right, enter from left
            case 2: nextCy = cy + 1; nextFromEdge = 0; break; // Exit bottom, enter from top
            case 3: nextCx = cx - 1; nextFromEdge = 1; break; // Exit left, enter from right
        }

        // Check bounds
        if (nextCx < 0 || nextCx >= w - 1 || nextCy < 0 || nextCy >= h - 1) {
            break;
        }

        // Check if we've completed the loop
        if (nextCx === startCx && nextCy === startCy) {
            break;
        }

        cx = nextCx;
        cy = nextCy;
        fromEdge = nextFromEdge;
    }

    return contour;
}

/**
 * Simplify a contour by removing points that are nearly collinear
 * @param {Array} contour - Array of {x, y} points
 * @param {number} tolerance - Distance tolerance for simplification
 * @returns {Array} Simplified contour
 */
export function simplifyContour(contour, tolerance = 0.001) {
    if (contour.length < 3) return contour;

    const result = [contour[0]];

    for (let i = 1; i < contour.length - 1; i++) {
        const prev = result[result.length - 1];
        const curr = contour[i];
        const next = contour[i + 1];

        // Calculate perpendicular distance from curr to line prev-next
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len < 0.0001) {
            result.push(curr);
            continue;
        }

        const dist = Math.abs((curr.y - prev.y) * dx - (curr.x - prev.x) * dy) / len;

        if (dist > tolerance) {
            result.push(curr);
        }
    }

    result.push(contour[contour.length - 1]);
    return result;
}

/**
 * Draw a smooth contour using bezier curves
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} contour - Array of {x, y} points (0-1 normalized)
 * @param {number} canvasW - Canvas width
 * @param {number} canvasH - Canvas height
 * @param {number} tension - Curve tension (0-1, higher = smoother)
 */
export function drawSmoothContour(ctx, contour, canvasW, canvasH, tension = 0.3) {
    if (contour.length < 2) return;

    const points = contour.map(p => ({ x: p.x * canvasW, y: p.y * canvasH }));

    ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
        ctx.lineTo(points[1].x, points[1].y);
        return;
    }

    // Use Catmull-Rom spline converted to bezier
    for (let i = 0; i < points.length; i++) {
        const p0 = points[(i - 1 + points.length) % points.length];
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 2) % points.length];

        // Catmull-Rom to Bezier control points
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
}

/**
 * Extract raw line segments from marching squares (for debug visualization)
 * Returns individual line segments rather than traced contours.
 * @param {Float32Array} grid - Intensity grid
 * @param {number} w - Grid width
 * @param {number} h - Grid height
 * @param {number} threshold - Intensity threshold for contour
 * @returns {Array} Array of segments [{x1, y1, x2, y2}] (0-1 normalized)
 */
export function extractLineSegments(grid, w, h, threshold) {
    const segments = [];

    // For each cell, find edge crossings and emit line segments
    for (let cy = 0; cy < h - 1; cy++) {
        for (let cx = 0; cx < w - 1; cx++) {
            // Get corner values (TL, TR, BR, BL)
            const tl = grid[cy * w + cx];
            const tr = grid[cy * w + cx + 1];
            const bl = grid[(cy + 1) * w + cx];
            const br = grid[(cy + 1) * w + cx + 1];

            // Classify corners (1 if above threshold, 0 if below)
            const config =
                (tl >= threshold ? 8 : 0) |
                (tr >= threshold ? 4 : 0) |
                (br >= threshold ? 2 : 0) |
                (bl >= threshold ? 1 : 0);

            // Skip empty or full cells
            if (config === 0 || config === 15) continue;

            // Cell position in normalized coords
            const cellX = cx / (w - 1);
            const cellY = cy / (h - 1);
            const cellW = 1 / (w - 1);
            const cellH = 1 / (h - 1);

            // Helper to interpolate edge crossing
            const interp = (v1, v2) => {
                if (Math.abs(v2 - v1) < 0.0001) return 0.5;
                return (threshold - v1) / (v2 - v1);
            };

            // Edge crossing points (top, right, bottom, left)
            const edgePoints = [
                { x: cellX + interp(tl, tr) * cellW, y: cellY },                    // 0: top
                { x: cellX + cellW, y: cellY + interp(tr, br) * cellH },            // 1: right
                { x: cellX + interp(bl, br) * cellW, y: cellY + cellH },            // 2: bottom
                { x: cellX, y: cellY + interp(tl, bl) * cellH },                    // 3: left
            ];

            // Segment lookup based on cell configuration
            // Each case maps to which edges to connect
            const segmentTable = {
                1:  [[3, 2]],           // BL above
                2:  [[2, 1]],           // BR above
                3:  [[3, 1]],           // BL, BR above
                4:  [[1, 0]],           // TR above
                5:  [[3, 0], [1, 2]],   // BL, TR above (saddle - ambiguous, pick one)
                6:  [[2, 0]],           // BR, TR above
                7:  [[3, 0]],           // BL, BR, TR above
                8:  [[0, 3]],           // TL above
                9:  [[0, 2]],           // BL, TL above
                10: [[0, 1], [2, 3]],   // BR, TL above (saddle - ambiguous, pick one)
                11: [[0, 1]],           // BL, BR, TL above
                12: [[1, 3]],           // TR, TL above
                13: [[1, 2]],           // BL, TR, TL above
                14: [[2, 3]],           // BR, TR, TL above
            };

            const cellSegments = segmentTable[config];
            if (cellSegments) {
                for (const [e1, e2] of cellSegments) {
                    segments.push({
                        x1: edgePoints[e1].x,
                        y1: edgePoints[e1].y,
                        x2: edgePoints[e2].x,
                        y2: edgePoints[e2].y,
                    });
                }
            }
        }
    }

    return segments;
}

/**
 * Debug render function: draws only marching squares contour lines
 * No fill, no shading, no background - just the raw isoline.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} foamRows - Foam row data
 * @param {number} canvasW - Canvas width
 * @param {number} canvasH - Canvas height (full canvas)
 * @param {Object} options - Rendering options
 * @param {number} options.threshold - Intensity threshold (default 0.3)
 * @param {number} options.gridW - Grid width (default 80)
 * @param {number} options.gridH - Grid height (default 60)
 * @param {number} options.blurPasses - Blur passes (default 2)
 * @param {string} options.strokeColor - Line color (default '#00ff00')
 * @param {number} options.lineWidth - Line width (default 2)
 */
export function renderContourDebug(ctx, foamRows, canvasW, canvasH, options = {}) {
    const {
        threshold = 0.3,
        gridW = 80,
        gridH = 60,
        blurPasses = 2,
        strokeColor = '#00ff00',
        lineWidth = 2,
    } = options;

    // Ocean area (excluding shore - assume 80px shore)
    const shoreHeight = 80;
    const oceanH = canvasH - shoreHeight;

    // Build intensity grid from foam rows
    const grid = buildIntensityGrid(foamRows, gridW, gridH, canvasW, oceanH);

    // Apply blur to smooth the data
    const blurred = blurPasses > 0 ? boxBlur(grid, gridW, gridH, blurPasses) : grid;

    // Extract line segments using marching squares
    const segments = extractLineSegments(blurred, gridW, gridH, threshold);

    // Draw the line segments
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (const seg of segments) {
        const x1 = seg.x1 * canvasW;
        const y1 = seg.y1 * oceanH;
        const x2 = seg.x2 * canvasW;
        const y2 = seg.y2 * oceanH;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    return { segmentCount: segments.length };
}

/**
 * Render multiple contour thresholds as nested colored rings.
 * Higher thresholds = inner rings (denser foam), lower thresholds = outer rings (lighter foam).
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} foamRows - Foam row data
 * @param {number} canvasW - Canvas width
 * @param {number} canvasH - Canvas height (full canvas)
 * @param {Object} options - Rendering options
 * @param {Array} options.thresholds - Array of {value, color, lineWidth} objects, sorted high to low
 * @param {number} options.gridW - Grid width (default 80)
 * @param {number} options.gridH - Grid height (default 60)
 * @param {number} options.blurPasses - Blur passes (default 2)
 */
export function renderMultiContour(ctx, foamRows, canvasW, canvasH, options = {}) {
    const {
        thresholds = [
            { value: 0.5, color: '#ffffff', lineWidth: 3 },  // Inner - dense foam
            { value: 0.3, color: '#aaddff', lineWidth: 2 },  // Middle
            { value: 0.15, color: '#6699cc', lineWidth: 1 }, // Outer - light foam
        ],
        gridW = 80,
        gridH = 60,
        blurPasses = 2,
        oceanBottom = null,  // If provided, use instead of canvasH - shoreHeight
    } = options;

    // Ocean area (excluding shore)
    const oceanH = oceanBottom ?? (canvasH - 80);

    // Build intensity grid from foam rows
    const grid = buildIntensityGrid(foamRows, gridW, gridH, canvasW, oceanH);

    // Apply blur to smooth the data
    const blurred = blurPasses > 0 ? boxBlur(grid, gridW, gridH, blurPasses) : grid;

    const results = [];

    // Draw from outer (low threshold) to inner (high threshold) so inner overlays outer
    const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);

    for (const { value, color, lineWidth } of sortedThresholds) {
        const segments = extractLineSegments(blurred, gridW, gridH, value);

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (const seg of segments) {
            const x1 = seg.x1 * canvasW;
            const y1 = seg.y1 * oceanH;
            const x2 = seg.x2 * canvasW;
            const y2 = seg.y2 * oceanH;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();

        results.push({ threshold: value, segmentCount: segments.length });
    }

    return results;
}

/**
 * Render multi-contour using Option A: Expanding segment bounds
 * Outer contours expand as foam ages, inner contours collapse
 */
export function renderMultiContourOptionA(ctx, foamRows, canvasW, canvasH, gameTime, options = {}) {
    const {
        thresholds = [
            { value: 0.5, color: '#ffffff', lineWidth: 3 },
            { value: 0.3, color: '#aaddff', lineWidth: 2 },
            { value: 0.15, color: '#6699cc', lineWidth: 1 },
        ],
        gridW = 80,
        gridH = 60,
        blurPasses = 2,
        oceanBottom = null,
    } = options;

    const oceanH = oceanBottom ?? (canvasH - 80);

    // Use Option A grid builder
    const grid = buildIntensityGridOptionA(foamRows, gridW, gridH, canvasW, oceanH, gameTime);
    const blurred = blurPasses > 0 ? boxBlur(grid, gridW, gridH, blurPasses) : grid;

    const results = [];
    const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);

    for (const { value, color, lineWidth } of sortedThresholds) {
        const segments = extractLineSegments(blurred, gridW, gridH, value);

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (const seg of segments) {
            ctx.moveTo(seg.x1 * canvasW, seg.y1 * oceanH);
            ctx.lineTo(seg.x2 * canvasW, seg.y2 * oceanH);
        }
        ctx.stroke();

        results.push({ threshold: value, segmentCount: segments.length });
    }

    return results;
}

/**
 * Render multi-contour using Option B: Age-based blur
 * More blur passes as foam ages, causing natural expansion
 */
export function renderMultiContourOptionB(ctx, foamRows, canvasW, canvasH, gameTime, options = {}) {
    const {
        thresholds = [
            { value: 0.5, color: '#ffffff', lineWidth: 3 },
            { value: 0.3, color: '#aaddff', lineWidth: 2 },
            { value: 0.15, color: '#6699cc', lineWidth: 1 },
        ],
        gridW = 80,
        gridH = 60,
        oceanBottom = null,
    } = options;

    const oceanH = oceanBottom ?? (canvasH - 80);

    // Use Option B grid builder - returns grid and dynamic blur passes
    const { grid, blurPasses } = buildIntensityGridOptionB(foamRows, gridW, gridH, canvasW, oceanH, gameTime);
    const blurred = blurPasses > 0 ? boxBlur(grid, gridW, gridH, blurPasses) : grid;

    const results = [];
    const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);

    for (const { value, color, lineWidth } of sortedThresholds) {
        const segments = extractLineSegments(blurred, gridW, gridH, value);

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (const seg of segments) {
            ctx.moveTo(seg.x1 * canvasW, seg.y1 * oceanH);
            ctx.lineTo(seg.x2 * canvasW, seg.y2 * oceanH);
        }
        ctx.stroke();

        results.push({ threshold: value, segmentCount: segments.length, blurPasses });
    }

    return results;
}

/**
 * Render multi-contour using Option C: Per-row dispersion radius
 * Most physically accurate - foam spreads in X and Y, core/halo fade separately
 */
export function renderMultiContourOptionC(ctx, foamRows, canvasW, canvasH, gameTime, options = {}) {
    const {
        thresholds = [
            { value: 0.5, color: '#ffffff', lineWidth: 3 },
            { value: 0.3, color: '#aaddff', lineWidth: 2 },
            { value: 0.15, color: '#6699cc', lineWidth: 1 },
        ],
        gridW = 80,
        gridH = 60,
        blurPasses = 2,
        oceanBottom = null,
    } = options;

    const oceanH = oceanBottom ?? (canvasH - 80);

    // Use Option C grid builder
    const grid = buildIntensityGridOptionC(foamRows, gridW, gridH, canvasW, oceanH, gameTime);
    const blurred = blurPasses > 0 ? boxBlur(grid, gridW, gridH, blurPasses) : grid;

    const results = [];
    const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value);

    for (const { value, color, lineWidth } of sortedThresholds) {
        const segments = extractLineSegments(blurred, gridW, gridH, value);

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (const seg of segments) {
            ctx.moveTo(seg.x1 * canvasW, seg.y1 * oceanH);
            ctx.lineTo(seg.x2 * canvasW, seg.y2 * oceanH);
        }
        ctx.stroke();

        results.push({ threshold: value, segmentCount: segments.length });
    }

    return results;
}
