/**
 * Wavelength Compression - Waves "stack up" as they slow
 */
import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, createMatrix } from '../shared';

export const PROGRESSION_WAVELENGTH_COMPRESSION = defineProgression({
  id: 'shoaling/wavelength-compression',
  description: 'Wavelength shortens as waves enter shallow water',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Two wave peaks in deep water, spread apart
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.6;
      matrix[3][col] = 0.6; // Second wave 3 rows behind
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    for (let row = rows - 1; row > 0; row--) {
      const speedFactor = 1 - (row / rows) * 0.5;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        const blend = speedFactor * dt * 2;
        data[idx] = data[idx] * (1 - blend) + data[srcIdx] * blend;
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.9;
    }
  },
  metadata: { label: 'Wavelength Compression' },
});

export const SHOALING_STRIP_COMPRESSION = {
  testId: 'strip-shoaling-compression',
  pageId: '03-shoaling/02-wavelength-compression',
  snapshots: PROGRESSION_WAVELENGTH_COMPRESSION.snapshots,
};
