import {
  defineProgression,
  GRID_WIDTH,
  GRID_HEIGHT,
  STATIC_CAPTURE,
  createMatrix,
} from '../../../test-utils';

/**
 * Reef - Localized reef creates circular shallow zone
 *
 * Circular feature creates distinct breaking pattern.
 */
export const PROGRESSION_REEF = defineProgression({
  id: 'bathymetry/reef',
  description: 'Localized reef creates circular shallow zone',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const reefRow = Math.floor(GRID_HEIGHT * 0.5);
    const reefCol = Math.floor(GRID_WIDTH * 0.5);
    const reefRadius = 2;

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);

      for (let col = 0; col < GRID_WIDTH; col++) {
        const dist = Math.sqrt((row - reefRow) ** 2 + (col - reefCol) ** 2);
        const reefEffect = dist < reefRadius ? 0.5 * (1 - dist / reefRadius) : 0;
        matrix[row][col] = Math.max(0, baseDepth - reefEffect);
      }
    }
    return matrix;
  })(),
  captureTimes: STATIC_CAPTURE,
  metadata: { label: 'Reef' },
});
