/**
 * Combined Shoaling Effects - Full simulation
 */
import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, createMatrix } from '../shared';

export const PROGRESSION_SHOALING_COMBINED = defineProgression({
  id: 'shoaling/combined',
  description: 'Full shoaling: height increase + speed decrease + compression',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.5;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5, 6, 7],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    for (let row = rows - 1; row > 0; row--) {
      const depth = 1 - row / (rows - 1);
      const speed = Math.sqrt(Math.max(0.1, depth));
      const shoaling = Math.pow(depth, -0.25);

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        const propagation = speed * dt * 2;
        const srcValue = data[srcIdx] * shoaling;

        data[idx] = Math.min(1.0, data[idx] * (1 - propagation) + srcValue * propagation);
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Combined Effects' },
});

export const SHOALING_STRIP_COMBINED = {
  testId: 'strip-shoaling-combined',
  pageId: '03-shoaling/04-combined',
  snapshots: PROGRESSION_SHOALING_COMBINED.snapshots,
};
