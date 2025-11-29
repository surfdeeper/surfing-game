import { defineProgression } from '../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Energy Transfer Progressions
 *
 * Shows where energy is being released from the energy field during wave breaking.
 * The transfer grid is a per-frame accumulator that feeds into the foam grid.
 */

// Single breaking point - concentrated energy release
export const PROGRESSION_SINGLE_BREAK = defineProgression({
  id: 'energy-transfer/single-break',
  description: 'Single wave breaking - concentrated energy release at one point',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Simulate initial energy transfer from a breaking wave
    matrix[5][5] = 0.8;
    matrix[5][4] = 0.4;
    matrix[5][6] = 0.4;
    matrix[4][5] = 0.2;
    matrix[6][5] = 0.2;
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'Single Break' },
});

// Line of breaking - wave face breaking across width
export const PROGRESSION_LINE_BREAK = defineProgression({
  id: 'energy-transfer/line-break',
  description: 'Wave breaking across full width - horizontal line of energy',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Horizontal line of breaking at row 5
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      const intensity = 0.6 + Math.random() * 0.3;
      matrix[5][x] = intensity;
    }
    // Slight spread above and below
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      matrix[4][x] = matrix[5][x] * 0.3;
      matrix[6][x] = matrix[5][x] * 0.5;
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'Line Break' },
});

// Multiple breaking points - scattered energy release
export const PROGRESSION_SCATTERED_BREAKS = defineProgression({
  id: 'energy-transfer/scattered-breaks',
  description: 'Multiple waves breaking at different locations',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Several breaking points at different locations
    const breakPoints = [
      { x: 2, y: 3, intensity: 0.7 },
      { x: 7, y: 4, intensity: 0.9 },
      { x: 4, y: 6, intensity: 0.5 },
      { x: 8, y: 7, intensity: 0.6 },
    ];
    for (const bp of breakPoints) {
      matrix[bp.y][bp.x] = bp.intensity;
      // Small spread around each point
      if (bp.x > 0) matrix[bp.y][bp.x - 1] = bp.intensity * 0.3;
      if (bp.x < GRID_WIDTH - 1) matrix[bp.y][bp.x + 1] = bp.intensity * 0.3;
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'Scattered Breaks' },
});

// No blur - sharp transfer pattern
export const PROGRESSION_NO_BLUR = defineProgression({
  id: 'energy-transfer/no-blur',
  description: 'Sharp energy transfer - no spatial blur',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Single concentrated point
    matrix[5][5] = 1.0;
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'No Blur' },
});

// With blur - spread transfer pattern
export const PROGRESSION_WITH_BLUR = defineProgression({
  id: 'energy-transfer/with-blur',
  description: 'Blurred energy transfer - spreads release over wider area',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Same single point but simulate blur effect
    // Box blur approximation
    const cx = 5,
      cy = 5;
    const sigma = 1.5;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const value = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        matrix[y][x] = value;
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'With Blur' },
});

// High blur - very spread pattern
export const PROGRESSION_HIGH_BLUR = defineProgression({
  id: 'energy-transfer/high-blur',
  description: 'High blur - very diffuse energy release',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const cx = 5,
      cy = 5;
    const sigma = 3.0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const value = Math.exp(-(dist * dist) / (2 * sigma * sigma));
        matrix[y][x] = value;
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'High Blur' },
});

export const ENERGY_TRANSFER_PROGRESSIONS = {
  singleBreak: PROGRESSION_SINGLE_BREAK,
  lineBreak: PROGRESSION_LINE_BREAK,
  scatteredBreaks: PROGRESSION_SCATTERED_BREAKS,
  noBlur: PROGRESSION_NO_BLUR,
  withBlur: PROGRESSION_WITH_BLUR,
  highBlur: PROGRESSION_HIGH_BLUR,
};

// ====================
// VISUAL TEST STRIPS - colocated with the data they render
// ====================

function progressionToSnapshot(prog: ReturnType<typeof defineProgression>) {
  const snapshot = prog.snapshots[0];
  return {
    ...snapshot,
    label: prog.metadata?.label ?? prog.id,
  };
}

export const ENERGY_TRANSFER_STRIP_BREAKING = {
  testId: 'strip-transfer-breaking',
  pageId: '05-energy-transfer',
  snapshots: [
    progressionToSnapshot(PROGRESSION_SINGLE_BREAK),
    progressionToSnapshot(PROGRESSION_LINE_BREAK),
    progressionToSnapshot(PROGRESSION_SCATTERED_BREAKS),
  ],
};

export const ENERGY_TRANSFER_STRIP_SPREAD = {
  testId: 'strip-transfer-spread',
  pageId: '05-energy-transfer',
  snapshots: [
    progressionToSnapshot(PROGRESSION_NO_BLUR),
    progressionToSnapshot(PROGRESSION_WITH_BLUR),
    progressionToSnapshot(PROGRESSION_HIGH_BLUR),
  ],
};

export const ENERGY_TRANSFER_STRIPS = [
  ENERGY_TRANSFER_STRIP_BREAKING,
  ENERGY_TRANSFER_STRIP_SPREAD,
];
