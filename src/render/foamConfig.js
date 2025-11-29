/**
 * Foam Rendering Configuration
 *
 * Defines threshold levels and colors for marching squares contour rendering.
 * Each option uses different colors for A/B testing different algorithms.
 */

// Base foam (white) - current production rendering
export const FOAM_THRESHOLDS_BASE = [
    { value: 0.15, color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1 },
    { value: 0.3, color: 'rgba(255, 255, 255, 0.6)', lineWidth: 2 },
    { value: 0.5, color: 'rgba(255, 255, 255, 0.9)', lineWidth: 3 },
];

// Option A (red tones) - Expand Bounds algorithm
export const FOAM_THRESHOLDS_A = [
    { value: 0.15, color: 'rgba(255, 100, 100, 0.4)', lineWidth: 1 },
    { value: 0.3, color: 'rgba(255, 150, 100, 0.7)', lineWidth: 2 },
    { value: 0.5, color: 'rgba(255, 200, 150, 0.9)', lineWidth: 3 },
];

// Option B (green tones) - Age Blur algorithm
export const FOAM_THRESHOLDS_B = [
    { value: 0.15, color: 'rgba(100, 255, 100, 0.4)', lineWidth: 1 },
    { value: 0.3, color: 'rgba(150, 255, 150, 0.7)', lineWidth: 2 },
    { value: 0.5, color: 'rgba(200, 255, 200, 0.9)', lineWidth: 3 },
];

// Option C (purple tones) - Dispersion Radius algorithm
export const FOAM_THRESHOLDS_C = [
    { value: 0.15, color: 'rgba(150, 100, 255, 0.4)', lineWidth: 1 },
    { value: 0.3, color: 'rgba(180, 150, 255, 0.7)', lineWidth: 2 },
    { value: 0.5, color: 'rgba(220, 200, 255, 0.9)', lineWidth: 3 },
];

/**
 * Render all enabled foam options
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} foamRows - Foam row data
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {number} gameTime - Current game time
 * @param {number} oceanBottom - Ocean bottom Y coordinate
 * @param {object} toggles - Visibility toggles
 * @param {object} renderers - Render functions {base, optionA, optionB, optionC}
 */
export function renderFoamContours(ctx, foamRows, w, h, gameTime, oceanBottom, toggles, renderers) {
    if (toggles.showFoamZones) {
        renderers.base(ctx, foamRows, w, h, { thresholds: FOAM_THRESHOLDS_BASE, oceanBottom });
    }
    if (toggles.showFoamOptionA) {
        renderers.optionA(ctx, foamRows, w, h, gameTime, { thresholds: FOAM_THRESHOLDS_A, oceanBottom });
    }
    if (toggles.showFoamOptionB) {
        renderers.optionB(ctx, foamRows, w, h, gameTime, { thresholds: FOAM_THRESHOLDS_B, oceanBottom });
    }
    if (toggles.showFoamOptionC) {
        renderers.optionC(ctx, foamRows, w, h, gameTime, { thresholds: FOAM_THRESHOLDS_C, oceanBottom });
    }
}
