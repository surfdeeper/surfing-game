import { defineProgression } from '../../../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 8;
const GRID_HEIGHT = 10;
const STATIC_CAPTURE = [0];

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Flat Bottom (Medium) - Constant medium depth (50%)
 *
 * Moderate wave-bottom interaction across the entire grid.
 */
export const PROGRESSION_FLAT_MEDIUM = defineProgression({
  id: 'bathymetry/flat-medium',
  description: 'Constant medium depth (50%) - moderate wave-bottom interaction',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const depth = 0.5;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  })(),
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: { label: 'Flat Bottom (Medium)' },
});
