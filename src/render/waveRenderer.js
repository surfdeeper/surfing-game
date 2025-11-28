/**
 * Wave Renderer - Draws waves as gradient bands
 *
 * Features:
 * - Per-X slice rendering for wave refraction (bending)
 * - Gradient from peak (dark) to trough (light)
 * - Energy field integration for thickness scaling
 * - Separate styles for set waves vs background waves
 */

import { getWaveProgress, WAVE_TYPE, WAVE_X_SAMPLES } from '../state/waveModel.js';
import { getHeightAt } from '../state/energyFieldModel.js';
import { progressToScreenY } from './coordinates.js';

/**
 * Wave color palettes by type
 */
export const WAVE_COLORS = {
    setWave: {
        peak: { r: 26, g: 60, b: 89 },     // Dark blue
        trough: { r: 65, g: 110, b: 140 }, // Medium blue
    },
    backgroundWave: {
        peak: { r: 35, g: 70, b: 95 },     // Slightly lighter dark
        trough: { r: 55, g: 100, b: 130 }, // Muted blue
    },
};

/**
 * Get wave colors based on type and amplitude
 * @param {object} wave - Wave object
 * @returns {{peak: string, trough: string}} CSS color strings
 */
export function getWaveColors(wave) {
    const isSet = wave.type === WAVE_TYPE.SET;
    const palette = isSet ? WAVE_COLORS.setWave : WAVE_COLORS.backgroundWave;

    // Increase contrast for high amplitude waves
    const maxContrast = isSet ? 0.5 : 0.3;
    const contrast = wave.amplitude * maxContrast;

    // Darken peak, lighten trough based on amplitude
    const peakR = Math.floor(palette.peak.r * (1 - contrast * 0.5));
    const peakG = Math.floor(palette.peak.g * (1 - contrast * 0.5));
    const peakB = Math.floor(palette.peak.b * (1 - contrast * 0.5));

    const troughR = Math.floor(Math.min(255, palette.trough.r * (1 + contrast * 0.3)));
    const troughG = Math.floor(Math.min(255, palette.trough.g * (1 + contrast * 0.3)));
    const troughB = Math.floor(Math.min(255, palette.trough.b * (1 + contrast * 0.3)));

    return {
        peak: `rgb(${peakR}, ${peakG}, ${peakB})`,
        trough: `rgb(${troughR}, ${troughG}, ${troughB})`,
    };
}

/**
 * Render a single wave as a gradient band
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {object} wave - Wave object with progressPerX
 * @param {object} options - Rendering options
 * @param {number} options.canvasWidth - Width of canvas
 * @param {number} options.oceanTop - Y coordinate of horizon
 * @param {number} options.oceanBottom - Y coordinate of shore
 * @param {number} options.shoreY - Y coordinate where shore begins
 * @param {number} options.gameTime - Current game time in ms
 * @param {number} options.travelDuration - Wave travel duration in ms
 * @param {boolean} options.showBathymetry - Whether bathymetry is visible
 * @param {boolean} options.showEnergyField - Whether to use energy scaling
 * @param {object} options.energyField - Energy field for thickness scaling
 */
export function renderWave(ctx, wave, options) {
    const {
        canvasWidth,
        oceanTop,
        oceanBottom,
        shoreY,
        gameTime,
        travelDuration,
        showBathymetry = false,
        showEnergyField = false,
        energyField = null,
    } = options;

    const isSet = wave.type === WAVE_TYPE.SET;

    // Type-specific thickness ranges
    const minThickness = isSet ? 40 : 25;
    const maxThickness = isSet ? 120 : 60;

    // Get colors
    const waveColors = getWaveColors(wave);

    // Set alpha based on visibility settings
    const baseAlpha = isSet ? 1.0 : 0.85;
    ctx.globalAlpha = showBathymetry ? 0.7 : baseAlpha;

    // Draw wave as vertical slices
    const numSlices = wave.progressPerX ? wave.progressPerX.length : WAVE_X_SAMPLES;
    const sliceWidth = canvasWidth / numSlices;

    for (let i = 0; i < numSlices; i++) {
        const normalizedX = (i + 0.5) / numSlices;
        const progress = wave.progressPerX
            ? wave.progressPerX[i]
            : getWaveProgress(wave, gameTime, travelDuration);
        const peakY = progressToScreenY(progress, oceanTop, oceanBottom);

        // Calculate thickness
        let thicknessMultiplier = wave.amplitude;
        if (showEnergyField && energyField) {
            const energyAtSlice = getHeightAt(energyField, normalizedX, progress);
            thicknessMultiplier = 0.01 + energyAtSlice * 0.99;
        }

        const waveSpacing = minThickness + (maxThickness - minThickness) * thicknessMultiplier;
        const halfSpacing = waveSpacing / 2;
        const troughY = peakY + halfSpacing;
        const nextPeakY = peakY + waveSpacing;

        const sliceX = i * sliceWidth;

        // First half: peak (dark) to trough (light)
        if (troughY > 0 && peakY < shoreY) {
            const grad1 = ctx.createLinearGradient(0, peakY, 0, troughY);
            grad1.addColorStop(0, waveColors.peak);
            grad1.addColorStop(1, waveColors.trough);
            ctx.fillStyle = grad1;
            ctx.fillRect(
                sliceX,
                Math.max(0, peakY),
                sliceWidth + 1,
                Math.min(troughY, shoreY) - Math.max(0, peakY)
            );
        }

        // Second half: trough (light) to next peak (dark)
        if (nextPeakY > 0 && troughY < shoreY) {
            const grad2 = ctx.createLinearGradient(0, troughY, 0, nextPeakY);
            grad2.addColorStop(0, waveColors.trough);
            grad2.addColorStop(1, waveColors.peak);
            ctx.fillStyle = grad2;
            ctx.fillRect(
                sliceX,
                Math.max(0, troughY),
                sliceWidth + 1,
                Math.min(nextPeakY, shoreY) - Math.max(0, troughY)
            );
        }
    }

    ctx.globalAlpha = 1.0;
}

/**
 * Render multiple waves, sorted by progress (painter's algorithm)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} waves - Array of wave objects
 * @param {object} options - Rendering options (same as renderWave)
 * @param {object} visibility - Visibility toggles
 * @param {boolean} visibility.showSetWaves - Show set waves
 * @param {boolean} visibility.showBackgroundWaves - Show background waves
 */
export function renderWaves(ctx, waves, options, visibility = {}) {
    const { showSetWaves = true, showBackgroundWaves = true } = visibility;
    const { gameTime, travelDuration } = options;

    // Sort by progress (waves closer to horizon render first)
    const sortedWaves = [...waves].sort((a, b) => {
        const progressA = getWaveProgress(a, gameTime, travelDuration);
        const progressB = getWaveProgress(b, gameTime, travelDuration);
        return progressA - progressB;
    });

    for (const wave of sortedWaves) {
        const isSetWave = wave.type === WAVE_TYPE.SET;
        const isVisible = isSetWave ? showSetWaves : showBackgroundWaves;

        if (isVisible) {
            renderWave(ctx, wave, options);
        }
    }

    ctx.globalAlpha = 1.0;
}
