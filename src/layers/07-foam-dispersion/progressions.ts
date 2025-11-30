import { defineProgression } from '../../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Foam dispersion progressions show how foam behaves after wave breaking:
 * - Intensity decay (bubbles pop)
 * - Spatial spreading (diffusion)
 * - Current-driven drift
 *
 * Field structure:
 * - field.gridHeight = number of rows
 * - field.width = number of columns
 * - field.height = Float32Array with the data
 */

// Intensity decay - foam fades over time
export const PROGRESSION_INTENSITY_DECAY = defineProgression({
  id: 'foam-dispersion/intensity-decay',
  description: 'Foam intensity decays as bubbles pop',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Concentrated foam patch in center
    for (let row = 3; row <= 6; row++) {
      for (let col = 3; col <= 6; col++) {
        const distFromCenter = Math.sqrt((row - 4.5) ** 2 + (col - 4.5) ** 2);
        matrix[row][col] = Math.max(0, 1.0 - distFromCenter * 0.3);
      }
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const data = field.height;

    // Exponential decay: foam = foam * exp(-decayRate * dt)
    const decayRate = 0.5; // 50% per second

    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Intensity Decay' },
});

// Fast decay - high decay coefficient
export const PROGRESSION_FAST_DECAY = defineProgression({
  id: 'foam-dispersion/fast-decay',
  description: 'High decay rate - foam disappears quickly',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let row = 3; row <= 6; row++) {
      for (let col = 3; col <= 6; col++) {
        matrix[row][col] = 0.9;
      }
    }
    return matrix;
  })(),
  captureTimes: [0, 0.5, 1, 1.5, 2, 2.5],
  updateFn: (field, dt) => {
    const data = field.height;
    const decayRate = 1.5; // Fast decay
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Fast Decay' },
});

// Slow decay - foam persists longer
export const PROGRESSION_SLOW_DECAY = defineProgression({
  id: 'foam-dispersion/slow-decay',
  description: 'Low decay rate - foam lingers',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let row = 3; row <= 6; row++) {
      for (let col = 3; col <= 6; col++) {
        matrix[row][col] = 0.9;
      }
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const data = field.height;
    const decayRate = 0.2; // Slow decay
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Slow Decay' },
});

// Spatial spreading - diffusion
export const PROGRESSION_SPATIAL_SPREADING = defineProgression({
  id: 'foam-dispersion/spatial-spreading',
  description: 'Foam spreads outward via diffusion',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Single concentrated point
    matrix[5][5] = 1.0;
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const diffusionRate = 0.3;

    // Copy current state
    const prev = new Float32Array(data);

    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const idx = row * cols + col;

        // Laplacian: sum of neighbors minus 4 * center
        const laplacian =
          prev[idx - cols] + prev[idx + cols] + prev[idx - 1] + prev[idx + 1] - 4 * prev[idx];

        // Diffusion equation: du/dt = D * laplacian(u)
        data[idx] = prev[idx] + diffusionRate * laplacian * dt;
        data[idx] = Math.max(0, data[idx]);
      }
    }
  },
  metadata: { label: 'Spreading' },
});

// Combined: decay + spreading
export const PROGRESSION_DECAY_AND_SPREAD = defineProgression({
  id: 'foam-dispersion/combined',
  description: 'Foam decays while spreading outward',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Concentrated deposit
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

    // Copy current state
    const prev = new Float32Array(data);

    // Diffusion
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const idx = row * cols + col;

        const laplacian =
          prev[idx - cols] + prev[idx + cols] + prev[idx - 1] + prev[idx + 1] - 4 * prev[idx];

        data[idx] = prev[idx] + diffusionRate * laplacian * dt;
      }
    }

    // Decay
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.max(0, data[i] * Math.exp(-decayRate * dt));
    }
  },
  metadata: { label: 'Decay + Spread' },
});

// Current-driven drift
export const PROGRESSION_CURRENT_DRIFT = defineProgression({
  id: 'foam-dispersion/current-drift',
  description: 'Longshore current pushes foam sideways',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Foam line at top
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
    const driftSpeed = 1.5; // cells per second to the right
    const decayRate = 0.2;

    // Copy and clear
    const prev = new Float32Array(data);
    data.fill(0);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const srcIdx = row * cols + col;
        const value = prev[srcIdx];

        if (value > 0.01) {
          // Calculate drift destination
          const dstCol = col + driftSpeed * dt;
          const col1 = Math.floor(dstCol);
          const col2 = col1 + 1;
          const frac = dstCol - col1;

          // Distribute to adjacent cells (linear interpolation)
          if (col1 >= 0 && col1 < cols) {
            data[row * cols + col1] += value * (1 - frac);
          }
          if (col2 >= 0 && col2 < cols) {
            data[row * cols + col2] += value * frac;
          }
        }
      }
    }

    // Apply decay
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.min(1, data[i] * Math.exp(-decayRate * dt));
    }
  },
  metadata: { label: 'Current Drift' },
});

export const FOAM_DISPERSION_PROGRESSIONS = {
  intensityDecay: PROGRESSION_INTENSITY_DECAY,
  fastDecay: PROGRESSION_FAST_DECAY,
  slowDecay: PROGRESSION_SLOW_DECAY,
  spatialSpreading: PROGRESSION_SPATIAL_SPREADING,
  combined: PROGRESSION_DECAY_AND_SPREAD,
  currentDrift: PROGRESSION_CURRENT_DRIFT,
};

// Visual test strips - colocated with the data they render

export const FOAM_DISPERSION_STRIP_DECAY = {
  testId: 'strip-foam-decay',
  pageId: '07-foam-dispersion',
  snapshots: [PROGRESSION_FAST_DECAY, PROGRESSION_SLOW_DECAY].flatMap((prog) =>
    prog.snapshots.slice(0, 4).map((s) => ({
      ...s,
      label: `${prog.metadata.label} ${s.label}`,
    }))
  ),
};

export const FOAM_DISPERSION_STRIP_SPATIAL = {
  testId: 'strip-foam-spatial',
  pageId: '07-foam-dispersion',
  snapshots: [PROGRESSION_SPATIAL_SPREADING, PROGRESSION_CURRENT_DRIFT].flatMap((prog) =>
    prog.snapshots.slice(0, 3).map((s) => ({
      ...s,
      label: `${prog.metadata.label} ${s.label}`,
    }))
  ),
};

export const FOAM_DISPERSION_STRIP_COMBINED = {
  testId: 'strip-foam-combined',
  pageId: '07-foam-dispersion',
  snapshots: PROGRESSION_DECAY_AND_SPREAD.snapshots,
};

// All strips for this layer
export const FOAM_DISPERSION_STRIPS = [
  FOAM_DISPERSION_STRIP_DECAY,
  FOAM_DISPERSION_STRIP_SPATIAL,
  FOAM_DISPERSION_STRIP_COMBINED,
];
