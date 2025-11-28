import { useRef, useEffect } from 'react';
import { DEFAULT_BATHYMETRY, getDepth } from '../state/bathymetryModel.js';
import { createWave, getWaveProgress, isWaveBreaking, WAVE_TYPE } from '../state/waveModel.js';
import {
    renderMultiContour,
    renderMultiContourOptionA,
    renderMultiContourOptionB,
    renderMultiContourOptionC,
} from '../render/marchingSquares.js';

// Canvas dimensions for stories
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const SHORE_HEIGHT = 40;

// Simulate foam generation and rendering
function simulateFoam(waves, gameTime, travelDuration, numXSamples = 80, foamYSpacing = 3) {
    const oceanTop = 0;
    const oceanBottom = CANVAS_HEIGHT - SHORE_HEIGHT;

    const foamRows = [];

    for (const wave of waves) {
        const progress = getWaveProgress(wave, gameTime, travelDuration);
        const waveY = oceanTop + progress * (oceanBottom - oceanTop);

        for (let y = oceanTop; y <= waveY; y += foamYSpacing) {
            const foamProgress = (y - oceanTop) / (oceanBottom - oceanTop);

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
                const rowSpawnTime = wave.spawnTime + (y / waveY) * (gameTime - wave.spawnTime);
                const age = (gameTime - rowSpawnTime) / 1000;
                const fadeTime = 10;
                const opacity = Math.max(0, 1 - age / fadeTime);

                foamRows.push({ y, spawnTime: rowSpawnTime, segments, opacity });
            }
        }
    }

    return foamRows;
}

// Small canvas for comic-strip frames
function SmallCanvas({ gameTimeSeconds, waveAmplitude, option, label }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const oceanBottom = h - SHORE_HEIGHT;

        const travelDuration = 20000;
        const gameTime = gameTimeSeconds * 1000;
        const wave = createWave(0, waveAmplitude, WAVE_TYPE.SET);
        const foamRows = simulateFoam([wave], gameTime, travelDuration);

        // Draw background
        ctx.fillStyle = '#1a4a6e';
        ctx.fillRect(0, 0, w, h);

        // Draw shore
        ctx.fillStyle = '#c2a86e';
        ctx.fillRect(0, oceanBottom, w, SHORE_HEIGHT);

        // Render foam based on option
        const thresholds = [
            { value: 0.5, color: '#ffffff', lineWidth: 2 },
            { value: 0.3, color: '#aaddff', lineWidth: 1.5 },
            { value: 0.15, color: '#6699cc', lineWidth: 1 },
        ];

        if (option === 'current') {
            renderMultiContour(ctx, foamRows, w, h, { thresholds });
        } else if (option === 'A') {
            renderMultiContourOptionA(ctx, foamRows, w, h, gameTime, { thresholds });
        } else if (option === 'B') {
            renderMultiContourOptionB(ctx, foamRows, w, h, gameTime, { thresholds });
        } else if (option === 'C') {
            renderMultiContourOptionC(ctx, foamRows, w, h, gameTime, { thresholds });
        }

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '11px monospace';
        ctx.fillText(label, 5, 14);

    }, [gameTimeSeconds, waveAmplitude, option, label]);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: '1px solid #333', display: 'block' }}
        />
    );
}

// Comic strip layout - row of frames for one option across time
function TimelineStrip({ option, optionLabel, times }) {
    return (
        <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '14px' }}>{optionLabel}</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {times.map(t => (
                    <SmallCanvas
                        key={t}
                        gameTimeSeconds={t}
                        waveAmplitude={0.8}
                        option={option}
                        label={`t=${t}s`}
                    />
                ))}
            </div>
        </div>
    );
}

// Key timestamps: wave travel (8, 12, 16, 20) + foam fade (24, 28)
const KEY_TIMES = [8, 12, 16, 20, 24, 28];

// ============================================
// MAIN STORIES
// ============================================

// Current behavior timeline - see how foam currently fades
export const CurrentBehavior = () => (
    <TimelineStrip option="current" optionLabel="Current Behavior" times={KEY_TIMES} />
);

// Option A timeline - expanding segment bounds
export const OptionAExpandBounds = () => (
    <TimelineStrip option="A" optionLabel="Option A: Expand Segment Bounds" times={KEY_TIMES} />
);

// Option B timeline - age-based blur
export const OptionBAgeBlur = () => (
    <TimelineStrip option="B" optionLabel="Option B: Age-Based Blur" times={KEY_TIMES} />
);

// Option C timeline - per-row dispersion radius
export const OptionCDispersionRadius = () => (
    <TimelineStrip option="C" optionLabel="Option C: Per-Row Dispersion Radius" times={KEY_TIMES} />
);

// Side-by-side comparison at key moments
export const CompareAllOptions = () => {
    const compareTime = 24; // Late foam - best to see dispersion differences
    return (
        <div>
            <h2 style={{ fontFamily: 'monospace', marginBottom: '16px' }}>
                Compare All Options at t={compareTime}s (foam fading)
            </h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <SmallCanvas gameTimeSeconds={compareTime} waveAmplitude={0.8} option="current" label="Current" />
                </div>
                <div>
                    <SmallCanvas gameTimeSeconds={compareTime} waveAmplitude={0.8} option="A" label="Option A" />
                </div>
                <div>
                    <SmallCanvas gameTimeSeconds={compareTime} waveAmplitude={0.8} option="B" label="Option B" />
                </div>
                <div>
                    <SmallCanvas gameTimeSeconds={compareTime} waveAmplitude={0.8} option="C" label="Option C" />
                </div>
            </div>
        </div>
    );
};

// Full comparison matrix - all options across all key times
export const FullComparisonMatrix = () => (
    <div>
        <h2 style={{ fontFamily: 'monospace', marginBottom: '16px' }}>
            Full Comparison: All Options Across Time
        </h2>
        <TimelineStrip option="current" optionLabel="Current" times={KEY_TIMES} />
        <TimelineStrip option="A" optionLabel="Option A: Expand Bounds" times={KEY_TIMES} />
        <TimelineStrip option="B" optionLabel="Option B: Age Blur" times={KEY_TIMES} />
        <TimelineStrip option="C" optionLabel="Option C: Dispersion" times={KEY_TIMES} />
    </div>
);

// Wave size comparison
export const WaveSizeComparison = () => (
    <div>
        <h2 style={{ fontFamily: 'monospace', marginBottom: '16px' }}>Wave Size Comparison (t=16s)</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div>
                <SmallCanvas gameTimeSeconds={16} waveAmplitude={0.4} option="current" label="Small (0.4)" />
            </div>
            <div>
                <SmallCanvas gameTimeSeconds={16} waveAmplitude={0.8} option="current" label="Medium (0.8)" />
            </div>
            <div>
                <SmallCanvas gameTimeSeconds={16} waveAmplitude={1.0} option="current" label="Large (1.0)" />
            </div>
        </div>
    </div>
);

export default {
    title: 'Foam Rendering',
};
