import { defineProgression } from '../../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Wave breaking progressions show the critical H/d > 0.78 threshold
 * where waves become unstable and break.
 *
 * Breaking types:
 * - Spilling: gentle slope, gradual break, foamy
 * - Plunging: medium slope, dramatic curl, hollow barrel
 * - Surging: steep slope, wave surges up beach without breaking
 *
 * Field structure:
 * - field.gridHeight = number of rows
 * - field.width = number of columns
 * - field.height = Float32Array with the data
 */

// Breaking criterion visualization - H/d ratio
export const PROGRESSION_BREAKING_CRITERION = defineProgression({
  id: 'wave-breaking/criterion',
  description: 'Wave breaks when H/d > 0.78',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Wave approaching critical depth
    // Top rows: stable (H/d < 0.78), Bottom rows: breaking (H/d > 0.78)
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const ratio = row / (GRID_HEIGHT - 1); // 0 to 1
      const intensity = ratio < 0.78 ? 0.5 : 1.0; // Jump at threshold
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

// Spilling breaker - gradual, foamy break on gentle slope
export const PROGRESSION_SPILLING = defineProgression({
  id: 'wave-breaking/spilling',
  description: 'Spilling breaker: gradual foam cascade on gentle slope',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Wave pulse at horizon
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

    // Spilling: gradual energy loss as wave breaks
    // Foam cascades down the face continuously
    const breakingRow = Math.floor(rows * 0.6); // Breaking starts at 60% down

    for (let row = rows - 1; row > 0; row--) {
      const isBreaking = row >= breakingRow;
      const decayFactor = isBreaking ? 0.85 : 1.0; // Gradual foam loss in breaking zone

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        // Propagate with gradual decay in breaking zone
        data[idx] = Math.max(0, data[srcIdx] * decayFactor);
      }
    }

    // Decay source
    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Spilling' },
});

// Plunging breaker - dramatic curl, hollow barrel
export const PROGRESSION_PLUNGING = defineProgression({
  id: 'wave-breaking/plunging',
  description: 'Plunging breaker: dramatic barrel on medium slope',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Stronger initial wave for more dramatic break
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

    // Plunging: sudden energy release, dramatic drop
    const breakingRow = Math.floor(rows * 0.5);
    const impactRow = Math.floor(rows * 0.7);

    for (let row = rows - 1; row > 0; row--) {
      const atBreaking = row === breakingRow;
      const atImpact = row >= impactRow;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        let value = data[srcIdx];

        // Plunging creates a sudden drop at breaking point
        if (atBreaking) {
          value *= 0.3; // Dramatic energy loss as lip plunges
        }

        // Impact zone: energy spreads as splash
        if (atImpact && data[srcIdx] > 0.2) {
          value *= 0.5;
        }

        data[idx] = value;
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Plunging' },
});

// Surging breaker - wave surges up steep beach
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

    // Surging: minimal breaking, wave maintains form until shore
    // Energy is absorbed by steep beach slope

    for (let row = rows - 1; row > 0; row--) {
      const nearShore = row >= rows - 2;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        let value = data[srcIdx];

        // Rapid absorption at shore (steep beach)
        if (nearShore) {
          value *= 0.4;
        }

        data[idx] = value;
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Surging' },
});

// Energy to foam conversion
export const PROGRESSION_ENERGY_TO_FOAM = defineProgression({
  id: 'wave-breaking/energy-to-foam',
  description: 'Breaking drains wave energy and deposits as foam',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Full energy wave
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 1.0;
      matrix[1][col] = 0.8;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, _dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    // Track foam separately (stored in bottom half intensity)
    const breakingRow = Math.floor(rows * 0.5);

    for (let row = rows - 1; row > 0; row--) {
      const isBreakingZone = row >= breakingRow && row < breakingRow + 2;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        let value = data[srcIdx];

        // In breaking zone: drain energy, convert to foam
        if (isBreakingZone && value > 0.3) {
          const drained = value * 0.4;
          value -= drained;
          // Foam effect: add glow to adjacent cells
          if (row + 1 < rows) {
            data[(row + 1) * cols + col] += drained * 0.3;
          }
        }

        data[idx] = Math.min(1.0, value);
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Energy to Foam' },
});

export const WAVE_BREAKING_PROGRESSIONS = {
  criterion: PROGRESSION_BREAKING_CRITERION,
  spilling: PROGRESSION_SPILLING,
  plunging: PROGRESSION_PLUNGING,
  surging: PROGRESSION_SURGING,
  energyToFoam: PROGRESSION_ENERGY_TO_FOAM,
};

// Visual test strips - colocated with the data they render

export const WAVE_BREAKING_STRIP_CRITERION = {
  testId: 'strip-breaking-criterion',
  pageId: '04-wave-breaking',
  snapshots: PROGRESSION_BREAKING_CRITERION.snapshots,
};

export const WAVE_BREAKING_STRIP_TYPES = {
  testId: 'strip-breaking-types',
  pageId: '04-wave-breaking',
  snapshots: [PROGRESSION_SPILLING, PROGRESSION_PLUNGING, PROGRESSION_SURGING].flatMap((prog) =>
    prog.snapshots.slice(0, 3).map((s) => ({
      ...s,
      label: `${prog.metadata.label} ${s.label}`,
    }))
  ),
};

export const WAVE_BREAKING_STRIP_ENERGY = {
  testId: 'strip-breaking-energy',
  pageId: '04-wave-breaking',
  snapshots: PROGRESSION_ENERGY_TO_FOAM.snapshots,
};

// All strips for this layer
export const WAVE_BREAKING_STRIPS = [
  WAVE_BREAKING_STRIP_CRITERION,
  WAVE_BREAKING_STRIP_TYPES,
  WAVE_BREAKING_STRIP_ENERGY,
];
