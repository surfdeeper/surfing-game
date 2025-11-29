// Energy Field Wave Model
// Continuous 2D field where waves are emergent peaks, not discrete objects
//
// The field stores height values at each grid point. Waves propagate via
// the wave equation with depth-dependent speed from bathymetry.

// Grid resolution - balance between accuracy and performance
export const FIELD_WIDTH = 60;   // X resolution (across screen)
export const FIELD_HEIGHT = 40;  // Y resolution (horizon to shore)

/**
 * Create a new energy field
 * @returns {object} Energy field with height and velocity arrays
 */
export function createEnergyField() {
    const size = FIELD_WIDTH * FIELD_HEIGHT;
    return {
        // Current height at each grid point
        height: new Float32Array(size),
        // Velocity (rate of change) for wave equation
        velocity: new Float32Array(size),
        // Dimensions
        width: FIELD_WIDTH,
        gridHeight: FIELD_HEIGHT,
    };
}

/**
 * Swell source - injects energy at the horizon
 * @param {number} period - Wave period in seconds
 * @param {number} amplitude - Wave amplitude (0-1)
 * @param {number} phase - Phase offset (0-1)
 * @returns {object} Swell source configuration
 */
export function createSwellSource(period, amplitude, phase = 0) {
    return { period, amplitude, phase };
}

/**
 * Default swell sources - groundswell + wind swell
 */
export const DEFAULT_SWELLS = [
    createSwellSource(12, 0.6, 0),      // Groundswell - longer period, larger
    createSwellSource(6, 0.25, 0.5),    // Wind swell - shorter period, smaller
];

/**
 * Inject swell energy at the horizon (y=0 row)
 * @param {object} field - Energy field
 * @param {array} swells - Array of swell sources
 * @param {number} gameTime - Current game time in seconds
 */
export function injectSwells(field, swells, gameTime) {
    const { width } = field;

    for (let x = 0; x < width; x++) {
        let totalHeight = 0;

        for (const swell of swells) {
            // Sinusoidal injection based on period
            const omega = (2 * Math.PI) / swell.period;
            const wave = swell.amplitude * Math.sin(omega * gameTime + swell.phase * 2 * Math.PI);
            totalHeight += wave;
        }

        // Set horizon row (y=0)
        field.height[x] = totalHeight;
        field.velocity[x] = 0; // Fixed boundary
    }
}

/**
 * Update the energy field using the wave equation
 * Waves propagate with depth-dependent speed: c = sqrt(g * depth)
 *
 * @param {object} field - Energy field to update (mutated)
 * @param {function} getDepthFn - Function(normalizedX, normalizedY) returning depth in meters
 * @param {number} dt - Time step in seconds
 */
export function resetRowAccumulator() {
    // No-op now, kept for test compatibility
}

export function updateEnergyField(field, getDepthFn, dt, travelDuration = 12, options = {}) {
    const { height, width, gridHeight } = field;
    const {
        depthDampingCoefficient = 1.5, // higher = stronger damping in shallow water
        depthDampingExponent = 2.0,    // >1 makes decay ramp sharply as depth→0
    } = options;

    // Smooth blending - how much of the row above to blend in per second
    // If travelDuration is 12s and we have 40 rows, each row should take 12/40 = 0.3s to cross
    // So blend rate per second = 1 / 0.3 = 3.33
    const blendPerSecond = gridHeight / travelDuration;
    const blend = Math.min(1, blendPerSecond * dt);

    // Depth-based damping: shallower water dissipates energy faster so it fades before the shoreline
    const MIN_DEPTH = 0.01; // avoid divide-by-zero while allowing near-zero depths

    // Work from bottom to top so we don't overwrite data we need
    for (let y = gridHeight - 1; y > 0; y--) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const aboveIdx = (y - 1) * width + x;

            // Blend current value with value from row above
            height[idx] = height[idx] * (1 - blend) + height[aboveIdx] * blend;

            // Apply depth-based damping (energy decays faster in shallow water)
            const normalizedX = (x + 0.5) / width;
            const normalizedY = y / (gridHeight - 1);
            const depth = Math.max(MIN_DEPTH, getDepthFn(normalizedX, normalizedY));
            const depthTerm = Math.pow(depth, depthDampingExponent);
            const damping = Math.exp(-depthDampingCoefficient * dt / depthTerm);
            height[idx] *= damping;
        }
    }

    // Fade horizon so pulses move down
    for (let x = 0; x < width; x++) {
        height[x] *= (1 - blend * 0.5);
    }

    // Lateral diffusion - spread energy sideways to fill vertical gaps
    // Higher spread rate to quickly fill gaps from breaking
    // TEMP: Disabled for testing drain visibility
    const lateralSpread = 0.0; // was 0.15
    for (let y = 1; y < gridHeight; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const left = height[idx - 1];
            const right = height[idx + 1];
            const current = height[idx];

            // Only spread if neighbors have less energy (fills gaps, doesn't dilute peaks)
            const maxNeighbor = Math.max(left, right);
            if (current > maxNeighbor) {
                // Share energy with lower neighbors
                const share = (current - maxNeighbor) * lateralSpread;
                height[idx] -= share;
                height[idx - 1] += share * 0.5;
                height[idx + 1] += share * 0.5;
            }
        }
    }

    // Horizontal band coherence - cells in the same row tend toward row average
    // This keeps energy in horizontal bands like the actual waves
    // TEMP: Disabled for testing drain visibility
    const bandCoherence = 0.0; // was 0.05
    for (let y = 1; y < gridHeight; y++) {
        // Calculate row average
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            rowSum += height[y * width + x];
        }
        const rowAvg = rowSum / width;

        // Blend each cell toward row average (but only if it has energy)
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (height[idx] > 0.05) {
                height[idx] = height[idx] * (1 - bandCoherence) + rowAvg * bandCoherence;
            }
        }
    }
}

/**
 * Get height at a normalized position (with bilinear interpolation)
 * @param {object} field - Energy field
 * @param {number} normalizedX - X position (0-1)
 * @param {number} normalizedY - Y position (0-1, 0=horizon, 1=shore)
 * @returns {number} Interpolated height value
 */
export function getHeightAt(field, normalizedX, normalizedY) {
    const { height, width, gridHeight } = field;

    // Convert to grid coordinates
    const gx = normalizedX * (width - 1);
    const gy = normalizedY * (gridHeight - 1);

    // Get integer grid indices
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, gridHeight - 1);

    // Fractional parts for interpolation
    const fx = gx - x0;
    const fy = gy - y0;

    // Sample four corners
    const h00 = height[y0 * width + x0];
    const h10 = height[y0 * width + x1];
    const h01 = height[y1 * width + x0];
    const h11 = height[y1 * width + x1];

    // Bilinear interpolation
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    return h0 * (1 - fy) + h1 * fy;
}

/**
 * Inject a single wave pulse at the horizon (when a discrete wave spawns)
 * @param {object} field - Energy field
 * @param {number} amplitude - Wave amplitude (0-1)
 */
export function injectWavePulse(field, amplitude) {
    const { width } = field;

    // Add pulse across the entire horizon row
    for (let x = 0; x < width; x++) {
        field.height[x] += amplitude;
    }
}

/**
 * Drain energy at a specific position (when foam is deposited)
 * @param {object} field - Energy field
 * @param {number} normalizedX - X position (0-1)
 * @param {number} normalizedY - Y position (0-1, 0=horizon, 1=shore)
 * @param {number} amount - Amount of energy to drain (0-1)
 * @returns {number} Amount of energy actually drained (may be less than requested if not enough energy)
 */
export function drainEnergyAt(field, normalizedX, normalizedY, amount) {
    const { height, width, gridHeight } = field;

    // Convert to grid coordinates
    const gx = Math.floor(normalizedX * width);
    const gy = Math.floor(normalizedY * gridHeight);

    // Clamp to valid range
    const x = Math.max(0, Math.min(width - 1, gx));
    const y = Math.max(0, Math.min(gridHeight - 1, gy));

    const idx = y * width + x;
    const currentEnergy = height[idx];

    // Treat negative heights as zero energy for dissipation purposes
    const available = Math.max(0, currentEnergy);
    const drained = Math.min(available, amount);

    // Reduce positive energy; leave negative components untouched (they don't contribute to dissipation)
    const remaining = currentEnergy - drained;
    height[idx] = remaining < 0 ? 0 : remaining;
    return drained;
}

/**
 * Modulate swell amplitude based on set/lull state
 * @param {array} swells - Array of swell sources (mutated)
 * @param {number} setMultiplier - Multiplier from set/lull model (0.5-1.5 range)
 */
export function modulateSwells(swells, setMultiplier) {
    // Only modulate the primary groundswell (index 0)
    if (swells.length > 0) {
        // Store base amplitude if not already stored
        if (swells[0].baseAmplitude === undefined) {
            swells[0].baseAmplitude = swells[0].amplitude;
        }
        swells[0].amplitude = swells[0].baseAmplitude * setMultiplier;
    }
}
