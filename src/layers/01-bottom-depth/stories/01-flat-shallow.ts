import { defineProgression } from '../../../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 8;
const GRID_HEIGHT = 10; // More rows for depth profiles (horizon to shore)
const STATIC_CAPTURE = [0];

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Flat Bottom (Shallow) - Constant shallow depth (25%)
 *
 * Waves interact strongly with the bottom everywhere, causing uniform shoaling effects.
 */
export const PROGRESSION_FLAT_SHALLOW = defineProgression({
  id: 'bathymetry/flat-shallow',
  description: 'Constant shallow depth (25%) - waves interact strongly with bottom everywhere',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const depth = 0.25;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  })(),
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: { label: 'Flat Bottom (Shallow)' },
});
