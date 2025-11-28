import { useRef, useEffect } from 'react';
import { DEFAULT_BATHYMETRY, getDepth } from '../state/bathymetryModel.js';
import { createWave, getWaveProgress, isWaveBreaking, WAVE_TYPE } from '../state/waveModel.js';
import { buildIntensityGrid, boxBlur, renderContourDebug, renderMultiContour } from '../render/marchingSquares.js';

// Canvas dimensions for stories
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHORE_HEIGHT = 80;

// Simulate foam generation and rendering
function simulateFoam(waves, gameTime, travelDuration, numXSamples = 80, foamYSpacing = 3) {
    const oceanTop = 0;
    const oceanBottom = CANVAS_HEIGHT - SHORE_HEIGHT;

    const foamRows = [];

    // For each wave, deposit foam rows from spawn to current position
    for (const wave of waves) {
        const progress = getWaveProgress(wave, gameTime, travelDuration);
        const waveY = oceanTop + progress * (oceanBottom - oceanTop);

        // Generate foam rows from horizon to current wave position
        for (let y = oceanTop; y <= waveY; y += foamYSpacing) {
            const foamProgress = (y - oceanTop) / (oceanBottom - oceanTop);

            // Scan across X to find breaking regions (spans)
            const segments = [];
            let spanStart = null;
            let spanIntensitySum = 0;
            let spanSampleCount = 0;

            for (let i = 0; i <= numXSamples; i++) {
                const normalizedX = (i + 0.5) / numXSamples;
                const depth = i < numXSamples ? getDepth(normalizedX, DEFAULT_BATHYMETRY, foamProgress) : Infinity;
                const isBreaking = i < numXSamples && isWaveBreaking(wave, depth);

                if (isBreaking) {
                    if (spanStart === null) {
                        spanStart = normalizedX;
                        spanIntensitySum = 0;
                        spanSampleCount = 0;
                    }
                    const intensity = Math.max(0, Math.min(1, 1 - depth / 3));
                    spanIntensitySum += intensity;
                    spanSampleCount++;
                } else if (spanStart !== null) {
                    const avgIntensity = spanSampleCount > 0 ? spanIntensitySum / spanSampleCount : 0.5;
                    segments.push({
                        startX: spanStart,
                        endX: (i - 0.5) / numXSamples,
                        intensity: avgIntensity
                    });
                    spanStart = null;
                }
            }

            if (segments.length > 0) {
                // Calculate age-based opacity (older foam fades)
                const rowSpawnTime = wave.spawnTime + (y / waveY) * (gameTime - wave.spawnTime);
                const age = (gameTime - rowSpawnTime) / 1000;
                const fadeTime = 10; // Longer fade time for better visualization
                const opacity = Math.max(0, 1 - age / fadeTime);

                foamRows.push({ y, spawnTime: rowSpawnTime, segments, opacity });
            }
        }
    }

    return foamRows;
}

// Render foam using rounded rectangles (legacy - jagged edges)
function renderFoamZonesLegacy(ctx, foamRows, w, h) {
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

// Render foam by drawing the blurred intensity grid directly
// This produces smooth edges without the complexity of contour tracing
function renderFoamZones(ctx, foamRows, w, h) {
    // Grid resolution - higher = smoother but more draw calls
    // 160x120 = 19,200 cells max, but we skip empty ones
    const GRID_W = 160;
    const GRID_H = 120;

    // Ocean area (excluding shore)
    const oceanH = h - 80; // SHORE_HEIGHT

    // Build intensity grid from foam rows
    const grid = buildIntensityGrid(foamRows, GRID_W, GRID_H, w, oceanH);

    // Apply blur to smooth the data (more passes = smoother edges)
    const blurred = boxBlur(grid, GRID_W, GRID_H, 4);

    // Cell dimensions
    const cellW = w / GRID_W;
    const cellH = oceanH / GRID_H;

    // Draw each cell with opacity based on blurred intensity
    for (let gy = 0; gy < GRID_H; gy++) {
        for (let gx = 0; gx < GRID_W; gx++) {
            const intensity = blurred[gy * GRID_W + gx];
            if (intensity < 0.03) continue; // Skip nearly empty cells

            const alpha = Math.min(0.95, intensity * 1.1);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
        }
    }
}

// Render foam using simple rectangles (debug view)
function renderFoamSamples(ctx, foamRows, w, numXSamples = 80) {
    const foamDotWidth = w / numXSamples + 2;
    const foamDotHeight = 4;

    for (const row of foamRows) {
        if (row.opacity <= 0) continue;

        for (const seg of row.segments) {
            const startX = seg.startX * w;
            const endX = seg.endX * w;

            // Draw small rectangles across the segment
            for (let x = startX; x < endX; x += foamDotWidth - 1) {
                ctx.fillStyle = `rgba(255, 255, 255, ${row.opacity * 0.85})`;
                ctx.fillRect(x - foamDotWidth / 2, row.y - foamDotHeight / 2, foamDotWidth, foamDotHeight);
            }
        }
    }
}

// Story component
function FoamCanvas({ gameTimeSeconds, showZones, showSamples, showContours, showMultiContour, waveAmplitude, label, contourOptions, multiContourOptions }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const oceanBottom = h - SHORE_HEIGHT;

        // Create a wave
        const travelDuration = 20000; // 20 seconds to travel
        const gameTime = gameTimeSeconds * 1000;
        const wave = createWave(0, waveAmplitude, WAVE_TYPE.SET);

        // Generate foam
        const foamRows = simulateFoam([wave], gameTime, travelDuration);

        // Draw background
        ctx.fillStyle = '#1a4a6e';
        ctx.fillRect(0, 0, w, h);

        // Draw shore
        ctx.fillStyle = '#c2a86e';
        ctx.fillRect(0, oceanBottom, w, SHORE_HEIGHT);

        // Render foam
        if (showZones) {
            renderFoamZones(ctx, foamRows, w, h);
        }
        if (showSamples) {
            renderFoamSamples(ctx, foamRows, w);
        }
        if (showContours) {
            const result = renderContourDebug(ctx, foamRows, w, h, contourOptions);
            console.log(`Contour debug: ${result.segmentCount} segments`);
        }
        if (showMultiContour) {
            const results = renderMultiContour(ctx, foamRows, w, h, multiContourOptions);
            console.log('Multi-contour:', results);
        }

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.fillText(label || `t=${gameTimeSeconds}s, amp=${waveAmplitude}`, 10, 20);

    }, [gameTimeSeconds, showZones, showSamples, showContours, showMultiContour, waveAmplitude, label, contourOptions, multiContourOptions]);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: '1px solid #333', display: 'block' }}
        />
    );
}

// Stories - sandbar is at progress 0.35, so with 20s travel time:
// - t=7s -> progress 0.35 (just hitting sandbar)
// - t=10s -> progress 0.5 (past sandbar, approaching point)
// - t=14s -> progress 0.7 (at the point/reef area)

export const ZonesEarlyWave = () => (
    <FoamCanvas
        gameTimeSeconds={8}
        showZones={true}
        showSamples={false}
        waveAmplitude={0.8}
        label="Foam Zones - Just past sandbar (t=8s)"
    />
);

export const ZonesMidWave = () => (
    <FoamCanvas
        gameTimeSeconds={12}
        showZones={true}
        showSamples={false}
        waveAmplitude={0.8}
        label="Foam Zones - Mid wave (t=12s)"
    />
);

export const ZonesLateWave = () => (
    <FoamCanvas
        gameTimeSeconds={16}
        showZones={true}
        showSamples={false}
        waveAmplitude={0.8}
        label="Foam Zones - Near shore (t=16s)"
    />
);

export const SamplesEarlyWave = () => (
    <FoamCanvas
        gameTimeSeconds={8}
        showZones={false}
        showSamples={true}
        waveAmplitude={0.8}
        label="Foam Samples (debug) - Just past sandbar (t=8s)"
    />
);

export const SamplesMidWave = () => (
    <FoamCanvas
        gameTimeSeconds={12}
        showZones={false}
        showSamples={true}
        waveAmplitude={0.8}
        label="Foam Samples (debug) - Mid wave (t=12s)"
    />
);

export const ComparisonMidWave = () => (
    <div style={{ display: 'flex', gap: '20px' }}>
        <FoamCanvas
            gameTimeSeconds={12}
            showZones={true}
            showSamples={false}
            waveAmplitude={0.8}
            label="Zones"
        />
        <FoamCanvas
            gameTimeSeconds={12}
            showZones={false}
            showSamples={true}
            waveAmplitude={0.8}
            label="Samples"
        />
    </div>
);

export const SmallWave = () => (
    <FoamCanvas
        gameTimeSeconds={12}
        showZones={true}
        showSamples={false}
        waveAmplitude={0.4}
        label="Small wave (amp=0.4)"
    />
);

export const LargeWave = () => (
    <FoamCanvas
        gameTimeSeconds={12}
        showZones={true}
        showSamples={false}
        waveAmplitude={1.0}
        label="Large wave (amp=1.0)"
    />
);

// Contour debug - single threshold isoline
export const ContourDebug = () => (
    <FoamCanvas
        gameTimeSeconds={14}
        showZones={false}
        showSamples={false}
        showContours={true}
        waveAmplitude={0.8}
        label="Marching squares contour (t=14s, past point)"
        contourOptions={{ threshold: 0.3, blurPasses: 2 }}
    />
);

// Nested rings - multiple thresholds combined (for layered foam rendering)
export const ContourNestedRings = () => (
    <FoamCanvas
        gameTimeSeconds={14}
        showZones={false}
        showSamples={false}
        showMultiContour={true}
        waveAmplitude={0.8}
        label="Nested contour rings (t=14s)"
        multiContourOptions={{
            thresholds: [
                { value: 0.5, color: '#ffffff', lineWidth: 3 },   // Inner - dense foam
                { value: 0.3, color: '#88ccff', lineWidth: 2 },   // Middle
                { value: 0.15, color: '#446688', lineWidth: 1 },  // Outer - light foam
            ],
        }}
    />
);

export default {
    title: 'Foam Rendering',
};
