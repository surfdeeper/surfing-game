import { defineProgression } from '../../../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 8;
const GRID_HEIGHT = 10;
const STATIC_CAPTURE = [0];

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Flat Bottom (Deep) - Constant deep water (100%)
 *
 * Waves travel unaffected by bottom - deep water conditions.
 */
export const PROGRESSION_FLAT_DEEP = defineProgression({
  id: 'bathymetry/flat-deep',
  description: 'Constant deep water (100%) - waves travel unaffected by bottom',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const depth = 1.0;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  })(),
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: { label: 'Flat Bottom (Deep)' },
});
