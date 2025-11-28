// Coordinate Mapping - Abstract (0-1) to Screen Pixels
// Pure functions for converting between coordinate systems

/**
 * Convert wave progress (0-1) to screen Y coordinate
 * @param {number} progress - Wave progress from 0 (horizon) to 1 (shore)
 * @param {number} oceanTop - Y coordinate of ocean top (horizon)
 * @param {number} oceanBottom - Y coordinate of ocean bottom (shore line)
 * @returns {number} Screen Y coordinate
 */
export function progressToScreenY(progress, oceanTop, oceanBottom) {
    return oceanTop + progress * (oceanBottom - oceanTop);
}

/**
 * Convert screen Y coordinate to wave progress (0-1)
 * @param {number} y - Screen Y coordinate
 * @param {number} oceanTop - Y coordinate of ocean top (horizon)
 * @param {number} oceanBottom - Y coordinate of ocean bottom (shore line)
 * @returns {number} Progress from 0 (horizon) to 1 (shore)
 */
export function screenYToProgress(y, oceanTop, oceanBottom) {
    return (y - oceanTop) / (oceanBottom - oceanTop);
}

/**
 * Calculate ocean bounds from canvas dimensions
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} shoreHeight - Height of shore area at bottom
 * @returns {object} { oceanTop, oceanBottom, shoreY }
 */
export function getOceanBounds(canvasHeight, shoreHeight) {
    const shoreY = canvasHeight - shoreHeight;
    return {
        oceanTop: 0,
        oceanBottom: shoreY,
        shoreY,
    };
}

/**
 * Calculate travel duration based on speed and ocean height
 * @param {number} oceanHeight - Height of ocean in pixels
 * @param {number} speed - Wave speed in pixels per second
 * @returns {number} Travel duration in milliseconds
 */
export function calculateTravelDuration(oceanHeight, speed) {
    return (oceanHeight / speed) * 1000;
}
