/**
 * Shared constants and utilities for Energy Field
 *
 * Separated to avoid circular dependencies with story files.
 */

// Small field dimensions for readable test output
export const SMALL_HEIGHT = 6;

// Standard travel duration (6 rows in 6 seconds = 1 row/sec)
export const TRAVEL_DURATION = 6;

// Standard initial state: energy pulse at horizon
export const INITIAL_PULSE = [
  [1.0, 1.0, 1.0, 1.0, 1.0], // row 0 (horizon) - pulse
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 1
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 2
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 3
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 4
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 5 (shore)
];

// Depth functions
export const deepWater = () => 10;
export const shallowGradient = (_normalizedX: number, normalizedY: number) => {
  // depth = 10 at horizon (y=0), depth = 0.5 at shore (y=1)
  return 10 - normalizedY * 9.5;
};

/**
 * Deep water translation update - moves energy down without spreading
 * In deep water, waves translate cleanly without dispersion
 */
export function updateDeepWaterTranslation(field: any, dt: number, travelDuration: number) {
  const { height, width, gridHeight } = field;

  // Time to cross one row
  const rowDuration = travelDuration / gridHeight;

  // Track accumulated time for row shifts
  if (field._accumTime === undefined) field._accumTime = 0;
  field._accumTime += dt;

  // Shift down when we've accumulated enough time for a row
  while (field._accumTime >= rowDuration) {
    field._accumTime -= rowDuration;

    // Shift all rows down by one (bottom to top to avoid overwriting)
    for (let y = gridHeight - 1; y > 0; y--) {
      for (let x = 0; x < width; x++) {
        height[y * width + x] = height[(y - 1) * width + x];
      }
    }
    // Clear the horizon row after shift
    for (let x = 0; x < width; x++) {
      height[x] = 0;
    }
  }
}
