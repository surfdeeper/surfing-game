import {
  defineProgression,
  GRID_WIDTH,
  GRID_HEIGHT,
  STATIC_CAPTURE,
  createMatrix,
} from '../../../test-utils';

/**
 * Linear Slope (Gentle) - Gentle gradient from shallow (25%) at horizon to shore
 *
 * Minimal depth change creates subtle shoaling effects.
 */
export const PROGRESSION_SLOPE_GENTLE = defineProgression({
  id: 'bathymetry/slope-gentle',
  description: 'Gentle gradient from shallow (25%) at horizon to shore - minimal depth change',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const maxDepth = 0.25; // Starts shallow
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = maxDepth * (1 - row / (GRID_HEIGHT - 1));
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  })(),
  captureTimes: STATIC_CAPTURE,
  metadata: { label: 'Linear Slope (Gentle)' },
});
