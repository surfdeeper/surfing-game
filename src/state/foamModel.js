// Foam Model - Independent whitewater/foam entities
// Foam is deposited where waves break and stays in place (doesn't move with wave)
//
// Key insight: Foam is a TRAIL left behind by breaking waves
// - Wave passes over shallow water → deposits foam at that (x, y)
// - Foam stays where deposited, just fades over time
// - Shape of foam naturally matches bathymetry contours

let nextFoamId = 1;

/**
 * Create a new foam segment (whitewater deposit)
 * @param {number} gameTime - Current game time in ms
 * @param {number} x - X position where foam deposited (normalized 0-1)
 * @param {number} y - Y position where foam deposited (screen pixels) - FIXED, doesn't move
 * @param {string} sourceWaveId - ID of wave that spawned this foam (for debugging)
 * @returns {object} Foam entity
 */
export function createFoam(gameTime, x, y, sourceWaveId) {
    return {
        id: `foam-${nextFoamId++}`,
        spawnTime: gameTime,
        x,                      // Fixed x position
        y,                      // Fixed y position - foam stays where deposited!
        opacity: 1.0,          // Starts fully opaque
        sourceWaveId,          // For debugging
    };
}

/**
 * Reset foam ID counter (for testing)
 */
export function resetFoamIdCounter() {
    nextFoamId = 1;
}

/**
 * Update a foam segment's appearance
 * Foam stays in place, just fades over time
 *
 * @param {object} foam - Foam entity to update (mutated in place)
 * @param {number} deltaTime - Time elapsed in seconds (unused, kept for API consistency)
 * @param {number} gameTime - Current game time in ms
 */
export function updateFoam(foam, deltaTime, gameTime) {
    // Foam stays in place - no movement!
    // Just fade over time
    const age = (gameTime - foam.spawnTime) / 1000; // seconds
    const fadeTime = 4; // seconds to fully fade
    foam.opacity = Math.max(0, 1 - age / fadeTime);
}

/**
 * Check if foam is still alive (visible)
 * @param {object} foam - Foam entity
 * @returns {boolean} True if foam should be kept
 */
export function isFoamAlive(foam) {
    // Remove if fully faded
    return foam.opacity > 0;
}

/**
 * Filter out dead foam segments
 * @param {array} foamSegments - Array of foam entities
 * @returns {array} Active foam segments
 */
export function getActiveFoam(foamSegments) {
    return foamSegments.filter(foam => isFoamAlive(foam));
}
