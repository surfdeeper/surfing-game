import { defineProgression } from '../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Foam Grid Progressions
 *
 * Shows foam density accumulation and advection over time.
 * The foam grid persists between frames, unlike the energy transfer grid.
 */

// Foam accumulation - energy deposits build up foam density
export const PROGRESSION_ACCUMULATION = defineProgression({
  id: 'foam-grid/accumulation',
  description: 'Foam density accumulates from repeated energy deposits',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Small initial deposit at breaking zone
    matrix[4][5] = 0.2;
    matrix[4][4] = 0.1;
    matrix[4][6] = 0.1;
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    // Simulate continued energy deposits at the breaking zone
    const depositY = 4;
    const depositAmount = 0.15 * dt;

    for (let x = 3; x <= 6; x++) {
      const idx = depositY * cols + x;
      // Deposit with some randomness
      const amount = depositAmount * (0.8 + Math.random() * 0.4);
      data[idx] = Math.min(1.0, data[idx] + amount);
    }

    // Simple decay
    const decayRate = 0.05;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Accumulation' },
});

// Foam advection - foam drifts toward shore
export const PROGRESSION_ADVECTION = defineProgression({
  id: 'foam-grid/advection',
  description: 'Foam drifts shoreward via advection',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Initial foam patch at top
    for (let x = 3; x <= 6; x++) {
      matrix[2][x] = 0.8;
      matrix[3][x] = 0.4;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    // Advection rate - fraction pushed down per second
    const advectRate = 0.4;
    const advectFactor = Math.min(1, advectRate * dt);

    // Work bottom-up to avoid double counting
    for (let y = rows - 2; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const downIdx = (y + 1) * cols + x;
        const portion = data[idx] * advectFactor;
        data[idx] -= portion;
        data[downIdx] = Math.min(1, data[downIdx] + portion);
      }
    }

    // Decay
    const decayRate = 0.15;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Advection' },
});

// Combined accumulation and advection
export const PROGRESSION_COMBINED = defineProgression({
  id: 'foam-grid/combined',
  description: 'Foam accumulates at breaking zone and drifts shoreward',
  initialMatrix: createMatrix,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    // Deposit at breaking zone
    const depositY = 3;
    const depositAmount = 0.25 * dt;
    for (let x = 2; x <= 7; x++) {
      const idx = depositY * cols + x;
      const amount = depositAmount * (0.7 + Math.random() * 0.6);
      data[idx] = Math.min(1.0, data[idx] + amount);
    }

    // Advection
    const advectRate = 0.3;
    const advectFactor = Math.min(1, advectRate * dt);
    for (let y = rows - 2; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const downIdx = (y + 1) * cols + x;
        const portion = data[idx] * advectFactor;
        data[idx] -= portion;
        data[downIdx] = Math.min(1, data[downIdx] + portion);
      }
    }

    // Decay
    const decayRate = 0.2;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Combined' },
});

// High advection - fast drift
export const PROGRESSION_HIGH_ADVECTION = defineProgression({
  id: 'foam-grid/high-advection',
  description: 'Fast shoreward drift - foam reaches shore quickly',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let x = 2; x <= 7; x++) {
      matrix[1][x] = 0.9;
    }
    return matrix;
  })(),
  captureTimes: [0, 0.5, 1, 1.5, 2, 2.5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    const advectRate = 0.8; // Fast
    const advectFactor = Math.min(1, advectRate * dt);

    for (let y = rows - 2; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const downIdx = (y + 1) * cols + x;
        const portion = data[idx] * advectFactor;
        data[idx] -= portion;
        data[downIdx] = Math.min(1, data[downIdx] + portion);
      }
    }

    const decayRate = 0.1;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'High Advection' },
});

export const FOAM_GRID_PROGRESSIONS = {
  accumulation: PROGRESSION_ACCUMULATION,
  advection: PROGRESSION_ADVECTION,
  combined: PROGRESSION_COMBINED,
  highAdvection: PROGRESSION_HIGH_ADVECTION,
};

// ====================
// VISUAL TEST STRIPS - colocated with the data they render
// ====================

export const FOAM_GRID_STRIP_ACCUMULATION = {
  testId: 'strip-foam-grid-accumulation',
  pageId: '06-foam-grid',
  snapshots: PROGRESSION_ACCUMULATION.snapshots,
};

export const FOAM_GRID_STRIP_ADVECTION = {
  testId: 'strip-foam-grid-advection',
  pageId: '06-foam-grid',
  snapshots: PROGRESSION_ADVECTION.snapshots,
};

export const FOAM_GRID_STRIP_COMBINED = {
  testId: 'strip-foam-grid-combined',
  pageId: '06-foam-grid',
  snapshots: PROGRESSION_COMBINED.snapshots,
};

export const FOAM_GRID_STRIPS = [
  FOAM_GRID_STRIP_ACCUMULATION,
  FOAM_GRID_STRIP_ADVECTION,
  FOAM_GRID_STRIP_COMBINED,
];
