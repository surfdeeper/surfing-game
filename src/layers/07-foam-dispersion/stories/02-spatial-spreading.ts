import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, createMatrix } from '../shared';

export const PROGRESSION_SPATIAL_SPREADING = defineProgression({
  id: 'foam-dispersion/spatial-spreading',
  description: 'Foam spreads outward via diffusion',
  initialMatrix: (() => {
    const matrix = createMatrix();
    matrix[5][5] = 1.0;
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const diffusionRate = 0.3;
    const prev = new Float32Array(data);

    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const idx = row * cols + col;
        const laplacian =
          prev[idx - cols] + prev[idx + cols] + prev[idx - 1] + prev[idx + 1] - 4 * prev[idx];
        data[idx] = prev[idx] + diffusionRate * laplacian * dt;
        data[idx] = Math.max(0, data[idx]);
      }
    }
  },
  metadata: { label: 'Spreading' },
});

export const PROGRESSION_CURRENT_DRIFT = defineProgression({
  id: 'foam-dispersion/current-drift',
  description: 'Longshore current pushes foam sideways',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let col = 2; col <= 4; col++) {
      matrix[2][col] = 0.8;
      matrix[3][col] = 0.6;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const driftSpeed = 1.5;
    const decayRate = 0.2;
    const prev = new Float32Array(data);
    data.fill(0);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const srcIdx = row * cols + col;
        const value = prev[srcIdx];
        if (value > 0.01) {
          const dstCol = col + driftSpeed * dt;
          const col1 = Math.floor(dstCol);
          const col2 = col1 + 1;
          const frac = dstCol - col1;
          if (col1 >= 0 && col1 < cols) data[row * cols + col1] += value * (1 - frac);
          if (col2 >= 0 && col2 < cols) data[row * cols + col2] += value * frac;
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.min(1, data[i] * Math.exp(-decayRate * dt));
    }
  },
  metadata: { label: 'Current Drift' },
});

export const FOAM_DISPERSION_STRIP_SPATIAL = {
  testId: 'strip-foam-spatial',
  pageId: '07-foam-dispersion/02-spatial-spreading',
  snapshots: [PROGRESSION_SPATIAL_SPREADING, PROGRESSION_CURRENT_DRIFT].flatMap((prog) =>
    prog.snapshots.slice(0, 3).map((s) => ({
      ...s,
      label: `${prog.metadata.label} ${s.label}`,
    }))
  ),
};
