// Bathymetry Model - Ocean floor depth map (2D)
// Defines where waves break based on shallow water
//
// Depth is 2-dimensional:
// - Y (progress): Gets shallower as waves approach shore
// - X (lateral): Uneven bottom - a "peak" where it's shallowest
//
// This creates realistic breaking: waves hit the shallow peak first,
// then the break "peels" laterally as adjacent sections reach breaking depth.

/**
 * Default bathymetry configuration
 *
 * Features:
 * - Sandbar: horizontal shallow band further out, waves break here first
 * - Point: triangular shallow area near shore, waves break again here
 * - Deep zone between sandbar and point where waves reform
 */
export const DEFAULT_BATHYMETRY = {
    deepDepth: 30,           // meters at horizon (progress=0)
    shoreDepth: 0.5,         // meters at shore (progress=1)

    // Sandbar - horizontal shallow band (waves break here, reform, then hit point)
    sandbar: {
        progress: 0.35,      // where sandbar is (35% to shore)
        width: 0.15,         // thickness in progress units (thicker band)
        shallowBonus: 18,    // how much shallower (meters) - causes more breaking
    },

    // Point/reef - triangular shallow area extending from shore
    peakX: 0.35,             // x location of the point/reef (35% from left)
    peakWidth: 0.2,          // how wide the point is laterally
    peakShallowBonus: 12,    // how much shallower the peak is (meters) - very prominent
    peakStartProgress: 0.55, // point extends from 55% progress to shore (after sandbar)
};

/**
 * Get water depth at a given position (2D)
 * Depth depends on both progress (Y) and lateral position (X)
 *
 * @param {number} normalizedX - X position normalized 0-1 (0=left, 1=right)
 * @param {object} config - Bathymetry configuration
 * @param {number} progress - Wave progress 0-1 (0=horizon, 1=shore)
 * @returns {number} Water depth in meters
 */
export function getDepth(normalizedX, config = DEFAULT_BATHYMETRY, progress = 0) {
    // Base depth: linear interpolation from deep (horizon) to shallow (shore)
    const baseDepth = config.deepDepth - (config.deepDepth - config.shoreDepth) * progress;

    let totalBonus = 0;

    // Sandbar bonus: horizontal shallow band spanning full width
    if (config.sandbar) {
        const sandbar = config.sandbar;
        const distFromSandbar = Math.abs(progress - sandbar.progress) / sandbar.width;
        if (distFromSandbar < 1) {
            // Smooth falloff from center of sandbar
            const t = 1 - distFromSandbar;
            totalBonus += sandbar.shallowBonus * t * t;
        }
    }

    // Peak/point bonus: triangular shallow area extending from shore
    // Like a headland, reef - apex points toward horizon
    const distFromPeak = Math.abs(normalizedX - config.peakX) / config.peakWidth;
    const peakStart = config.peakStartProgress || 0.5;

    // Only apply peak effect if:
    // 1. We're laterally close to the peak (within peakWidth)
    // 2. We're close enough to shore (past peakStartProgress)
    if (distFromPeak < 1 && progress > peakStart) {
        // How far into the peak zone are we? (0 at peakStart, 1 at shore)
        const progressInPeak = (progress - peakStart) / (1 - peakStart);

        // Lateral falloff (strongest at center of point)
        const lateralFalloff = 1 - distFromPeak;

        // Combined: peak is strongest near shore and at center
        const t = lateralFalloff * progressInPeak;
        totalBonus += config.peakShallowBonus * t * t;
    }

    // Final depth = base depth minus bonuses (shallower where bonuses apply)
    return Math.max(0.1, baseDepth - totalBonus);
}

/**
 * Get the shallowest depth (at shore)
 * @param {object} config - Bathymetry configuration
 * @returns {number} Minimum depth in meters
 */
export function getMinDepth(config = DEFAULT_BATHYMETRY) {
    return config.shoreDepth;
}

/**
 * Get the x position of the peak (shallowest point)
 * @param {object} config - Bathymetry configuration
 * @returns {number} Normalized x position (0-1)
 */
export function getPeakX(config = DEFAULT_BATHYMETRY) {
    return config.peakX;
}

/**
 * Check if a wave should start breaking based on depth and amplitude
 * Breaking occurs when wave height > 0.78 * water depth
 *
 * @param {number} waveHeight - Wave height in arbitrary units (amplitude * scale factor)
 * @param {number} depth - Water depth in meters
 * @returns {boolean} True if wave should break
 */
export function shouldBreak(waveHeight, depth) {
    const breakerIndex = 0.78;
    return waveHeight > breakerIndex * depth;
}

/**
 * Calculate wave height from amplitude
 * Converts our 0-1 amplitude to approximate wave height in meters
 *
 * @param {number} amplitude - Wave amplitude (0-1)
 * @returns {number} Wave height in meters
 */
export function amplitudeToHeight(amplitude) {
    // Scale: amplitude 1.0 = ~3 meter wave
    const maxHeight = 3;
    return amplitude * maxHeight;
}
