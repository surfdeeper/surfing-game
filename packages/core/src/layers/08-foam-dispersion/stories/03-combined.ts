import { defineProgression } from '../../../test-utils';
import { createMatrix } from '../shared';

export const PROGRESSION_DECAY_AND_SPREAD = defineProgression({
  id: 'foam-dispersion/combined',
  description: 'Foam decays while spreading outward',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let row = 4; row <= 5; row++) {
      for (let col = 4; col <= 5; col++) {
        matrix[row][col] = 1.0;
      }
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const diffusionRate = 0.25;
    const decayRate = 0.3;
    const prev = new Float32Array(data);

    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const idx = row * cols + col;
        const laplacian =
          prev[idx - cols] + prev[idx + cols] + prev[idx - 1] + prev[idx + 1] - 4 * prev[idx];
        data[idx] = prev[idx] + diffusionRate * laplacian * dt;
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.max(0, data[i] * Math.exp(-decayRate * dt));
    }
  },
  metadata: { label: 'Decay + Spread' },
});

export const FOAM_DISPERSION_STRIP_COMBINED = {
  testId: 'strip-foam-combined',
  pageId: '07-foam-dispersion/03-combined',
  snapshots: PROGRESSION_DECAY_AND_SPREAD.snapshots,
};
