import {
  defineProgression,
  GRID_WIDTH,
  GRID_HEIGHT,
  STATIC_CAPTURE,
  createMatrix,
} from '../../../test-utils';

/**
 * Sandbar - Shallow sandbar in mid-water creates secondary breaking zone
 *
 * Localized shallow feature affects wave breaking patterns.
 */
export const PROGRESSION_SANDBAR = defineProgression({
  id: 'bathymetry/sandbar',
  description: 'Shallow sandbar in mid-water creates secondary breaking zone',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const barRow = Math.floor(GRID_HEIGHT * 0.4); // 40% from horizon
    const barWidth = 2; // Rows affected by bar

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);

      // Add sandbar bump (reduces depth locally)
      const distFromBar = Math.abs(row - barRow);
      const barEffect = distFromBar < barWidth ? 0.4 * (1 - distFromBar / barWidth) : 0;

      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = Math.max(0, baseDepth - barEffect);
      }
    }
    return matrix;
  })(),
  captureTimes: STATIC_CAPTURE,
  metadata: { label: 'Sandbar' },
});
