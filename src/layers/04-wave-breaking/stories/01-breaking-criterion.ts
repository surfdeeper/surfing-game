import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../shared';

export const PROGRESSION_BREAKING_CRITERION = defineProgression({
  id: 'wave-breaking/criterion',
  description: 'Wave breaks when H/d > 0.78',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const ratio = row / (GRID_HEIGHT - 1);
      const intensity = ratio < 0.78 ? 0.5 : 1.0;
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = intensity;
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'H/d Threshold' },
});

export const WAVE_BREAKING_STRIP_CRITERION = {
  testId: 'strip-breaking-criterion',
  pageId: '04-wave-breaking/01-breaking-criterion',
  snapshots: PROGRESSION_BREAKING_CRITERION.snapshots,
};
