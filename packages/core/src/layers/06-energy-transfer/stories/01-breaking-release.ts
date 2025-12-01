import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../shared';

export const PROGRESSION_SINGLE_BREAK = defineProgression({
  id: 'energy-transfer/single-break',
  description: 'Single wave breaking - concentrated energy release at one point',
  initialMatrix: (() => {
    const matrix = createMatrix();
    matrix[5][5] = 0.8;
    matrix[5][4] = 0.4;
    matrix[5][6] = 0.4;
    matrix[4][5] = 0.2;
    matrix[6][5] = 0.2;
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: () => {},
  metadata: { label: 'Single Break' },
});

export const PROGRESSION_LINE_BREAK = defineProgression({
  id: 'energy-transfer/line-break',
  description: 'Wave breaking across full width - horizontal line of energy',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const variations = [0.7, 0.85, 0.65, 0.9, 0.75, 0.8, 0.7, 0.85];
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      matrix[5][x] = variations[(x - 1) % variations.length];
    }
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      matrix[4][x] = matrix[5][x] * 0.3;
      matrix[6][x] = matrix[5][x] * 0.5;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: () => {},
  metadata: { label: 'Line Break' },
});

export const PROGRESSION_SCATTERED_BREAKS = defineProgression({
  id: 'energy-transfer/scattered-breaks',
  description: 'Multiple waves breaking at different locations',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const breakPoints = [
      { x: 2, y: 3, intensity: 0.7 },
      { x: 7, y: 4, intensity: 0.9 },
      { x: 4, y: 6, intensity: 0.5 },
      { x: 8, y: 7, intensity: 0.6 },
    ];
    for (const bp of breakPoints) {
      matrix[bp.y][bp.x] = bp.intensity;
      if (bp.x > 0) matrix[bp.y][bp.x - 1] = bp.intensity * 0.3;
      if (bp.x < GRID_WIDTH - 1) matrix[bp.y][bp.x + 1] = bp.intensity * 0.3;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: () => {},
  metadata: { label: 'Scattered Breaks' },
});

function progressionToSnapshot(prog: ReturnType<typeof defineProgression>) {
  const snapshot = prog.snapshots[0];
  return { ...snapshot, label: prog.metadata?.label ?? prog.id };
}

export const ENERGY_TRANSFER_STRIP_BREAKING = {
  testId: 'strip-transfer-breaking',
  pageId: '05-energy-transfer/01-breaking-release',
  snapshots: [
    progressionToSnapshot(PROGRESSION_SINGLE_BREAK),
    progressionToSnapshot(PROGRESSION_LINE_BREAK),
    progressionToSnapshot(PROGRESSION_SCATTERED_BREAKS),
  ],
};
