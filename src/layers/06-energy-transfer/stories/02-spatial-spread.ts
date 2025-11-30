import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../shared';

export const PROGRESSION_NO_BLUR = defineProgression({
  id: 'energy-transfer/no-blur',
  description: 'Sharp energy transfer - no spatial blur',
  initialMatrix: (() => {
    const matrix = createMatrix();
    matrix[5][5] = 1.0;
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'No Blur' },
});

export const PROGRESSION_WITH_BLUR = defineProgression({
  id: 'energy-transfer/with-blur',
  description: 'Blurred energy transfer - spreads release over wider area',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const cx = 5,
      cy = 5,
      sigma = 1.5;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        matrix[y][x] = Math.exp(-(dist * dist) / (2 * sigma * sigma));
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'With Blur' },
});

export const PROGRESSION_HIGH_BLUR = defineProgression({
  id: 'energy-transfer/high-blur',
  description: 'High blur - very diffuse energy release',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const cx = 5,
      cy = 5,
      sigma = 3.0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        matrix[y][x] = Math.exp(-(dist * dist) / (2 * sigma * sigma));
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'High Blur' },
});

function progressionToSnapshot(prog: ReturnType<typeof defineProgression>) {
  const snapshot = prog.snapshots[0];
  return { ...snapshot, label: prog.metadata?.label ?? prog.id };
}

export const ENERGY_TRANSFER_STRIP_SPREAD = {
  testId: 'strip-transfer-spread',
  pageId: '05-energy-transfer/02-spatial-spread',
  snapshots: [
    progressionToSnapshot(PROGRESSION_NO_BLUR),
    progressionToSnapshot(PROGRESSION_WITH_BLUR),
    progressionToSnapshot(PROGRESSION_HIGH_BLUR),
  ],
};
