import { defineProgression } from '../../../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 8;
const GRID_HEIGHT = 10;
const STATIC_CAPTURE = [0];

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Linear Slope (Steep) - Steep gradient from deep (100%) at horizon to shore
 *
 * Maximum depth change creates strong shoaling effects.
 */
export const PROGRESSION_SLOPE_STEEP = defineProgression({
  id: 'bathymetry/slope-steep',
  description: 'Steep gradient from deep (100%) at horizon to shore - maximum depth change',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const maxDepth = 1.0;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = maxDepth * (1 - row / (GRID_HEIGHT - 1));
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  })(),
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: { label: 'Linear Slope (Steep)' },
});
