import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../shared';

export const PROGRESSION_SPILLING = defineProgression({
  id: 'wave-breaking/spilling',
  description: 'Spilling breaker: gradual foam cascade on gentle slope',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.6;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, _dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const breakingRow = Math.floor(rows * 0.6);

    for (let row = rows - 1; row > 0; row--) {
      const isBreaking = row >= breakingRow;
      const decayFactor = isBreaking ? 0.85 : 1.0;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;
        data[idx] = Math.max(0, data[srcIdx] * decayFactor);
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Spilling' },
});

export const PROGRESSION_PLUNGING = defineProgression({
  id: 'wave-breaking/plunging',
  description: 'Plunging breaker: dramatic barrel on medium slope',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.8;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, _dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const breakingRow = Math.floor(rows * 0.5);
    const impactRow = Math.floor(rows * 0.7);

    for (let row = rows - 1; row > 0; row--) {
      const atBreaking = row === breakingRow;
      const atImpact = row >= impactRow;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;
        let value = data[srcIdx];

        if (atBreaking) value *= 0.3;
        if (atImpact && data[srcIdx] > 0.2) value *= 0.5;

        data[idx] = value;
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Plunging' },
});

export const PROGRESSION_SURGING = defineProgression({
  id: 'wave-breaking/surging',
  description: 'Surging breaker: wave surges up steep beach without breaking',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.7;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, _dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    for (let row = rows - 1; row > 0; row--) {
      const nearShore = row >= rows - 2;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;
        let value = data[srcIdx];

        if (nearShore) value *= 0.4;
        data[idx] = value;
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Surging' },
});

export const WAVE_BREAKING_STRIP_TYPES = {
  testId: 'strip-breaking-types',
  pageId: '04-wave-breaking/02-breaking-types',
  snapshots: [PROGRESSION_SPILLING, PROGRESSION_PLUNGING, PROGRESSION_SURGING].flatMap((prog) =>
    prog.snapshots.slice(0, 3).map((s) => ({
      ...s,
      label: `${prog.metadata.label} ${s.label}`,
    }))
  ),
};
