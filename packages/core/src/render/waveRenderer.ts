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
 * Wave color palettes by type (hex values matching original main.jsx)
 */
export const WAVE_COLORS = {
  setWave: {
    peak: '#0d3a5c', // Deep, rich blue at peaks
    trough: '#2e7aa8', // Saturated trough - full contrast
  },
  backgroundWave: {
    peak: '#2a5a7e', // Lighter, more muted peak
    trough: '#5a9ac0', // Desaturated, subtle trough
  },
};

// Parse hex color to RGB components
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
}

/**
 * Get wave colors based on type and amplitude
 * Matches original main.jsx algorithm for visual parity
 * @param {object} wave - Wave object
 * @returns {{peak: string, trough: string}} CSS color strings
 */
export function getWaveColors(wave) {
  const isSet = wave.type === WAVE_TYPE.SET;
  const palette = isSet ? WAVE_COLORS.setWave : WAVE_COLORS.backgroundWave;

  // Set waves get full contrast; background waves max out at 60%
  const maxContrast = isSet ? 1.0 : 0.6;
  const contrast = wave.amplitude * maxContrast;

  const peak = hexToRgb(palette.peak);
  const trough = hexToRgb(palette.trough);

  // Lerp from peak toward trough based on contrast
  const r = peak.r + (trough.r - peak.r) * contrast;
  const g = peak.g + (trough.g - peak.g) * contrast;
  const b = peak.b + (trough.b - peak.b) * contrast;

  return {
    peak: palette.peak,
    trough: rgbToHex(r, g, b),
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
export function renderWaves(ctx, waves, options, visibility: Record<string, any> = {}) {
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
