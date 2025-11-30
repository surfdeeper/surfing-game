/**
 * Energy Field Progressions
 *
 * Progression definitions for energy field visualization and testing.
 * These are separated from the .test.ts file to allow importing without vitest.
 */
import { updateEnergyField, drainEnergyAt } from './model.js';
import { defineProgression, captureWithEvents } from '../../test-utils/index.js';

// Small field dimensions for readable test output
const SMALL_HEIGHT = 6;

// Standard initial state: energy pulse at horizon
const INITIAL_PULSE = [
  [1.0, 1.0, 1.0, 1.0, 1.0], // row 0 (horizon) - pulse
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 1
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 2
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 3
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 4
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 5 (shore)
];

// Depth functions
const deepWater = () => 10;
const shallowGradient = (_normalizedX: number, normalizedY: number) => {
  // depth = 10 at horizon (y=0), depth = 0.5 at shore (y=1)
  return 10 - normalizedY * 9.5;
};

// Standard travel duration (6 rows in 6 seconds = 1 row/sec)
const TRAVEL_DURATION = 6;

/**
 * Deep water translation update - moves energy down without spreading
 * In deep water, waves translate cleanly without dispersion
 */
function updateDeepWaterTranslation(field: any, dt: number, travelDuration: number) {
  const { height, width, gridHeight } = field;

  // Time to cross one row
  const rowDuration = travelDuration / gridHeight;

  // Track accumulated time for row shifts
  if (field._accumTime === undefined) field._accumTime = 0;
  field._accumTime += dt;

  // Shift down when we've accumulated enough time for a row
  while (field._accumTime >= rowDuration) {
    field._accumTime -= rowDuration;

    // Shift all rows down by one (bottom to top to avoid overwriting)
    for (let y = gridHeight - 1; y > 0; y--) {
      for (let x = 0; x < width; x++) {
        height[y * width + x] = height[(y - 1) * width + x];
      }
    }
    // Clear the horizon row after shift
    for (let x = 0; x < width; x++) {
      height[x] = 0;
    }
  }
}

/**
 * No damping (deep water) - energy translates as a sharp line
 */
export const PROGRESSION_NO_DAMPING = defineProgression({
  id: 'energy-field/no-damping',
  description: 'Deep water - energy translates as a sharp horizontal line without spreading',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateDeepWaterTranslation(field, dt, TRAVEL_DURATION);
  },
  metadata: {
    depthDampingCoefficient: 0,
    behavior: 'pure translation (no spreading)',
    depthFn: 'deep water (constant 10m)',
    travelDuration: TRAVEL_DURATION,
    label: 'No Damping',
  },
});

/**
 * Low damping - subtle decay in shallow water
 */
export const PROGRESSION_LOW_DAMPING = defineProgression({
  id: 'energy-field/low-damping',
  description: 'Low damping - subtle decay near shore',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateEnergyField(field, shallowGradient, dt, TRAVEL_DURATION, {
      depthDampingCoefficient: 0.05,
      depthDampingExponent: 2.0,
    });
  },
  metadata: {
    depthDampingCoefficient: 0.05,
    depthDampingExponent: 2.0,
    depthFn: 'shallow gradient (10m horizon to 0.5m shore)',
    travelDuration: TRAVEL_DURATION,
    label: 'Low Damping',
  },
});

/**
 * High damping - aggressive decay, energy mostly gone before reaching shore
 */
export const PROGRESSION_HIGH_DAMPING = defineProgression({
  id: 'energy-field/high-damping',
  description: 'High damping - energy mostly gone before reaching shore',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateEnergyField(field, shallowGradient, dt, TRAVEL_DURATION, {
      depthDampingCoefficient: 2.0,
      depthDampingExponent: 2.0,
    });
  },
  metadata: {
    depthDampingCoefficient: 2.0,
    depthDampingExponent: 2.0,
    depthFn: 'shallow gradient (10m horizon to 0.5m shore)',
    travelDuration: TRAVEL_DURATION,
    label: 'High Damping',
  },
});

/**
 * With energy drain (breaking simulation)
 * Drain at t=1s when energy is still concentrated, creating a visible gap
 */
export const PROGRESSION_WITH_DRAIN = (() => {
  const snapshots = captureWithEvents({
    initialMatrix: INITIAL_PULSE,
    captureTimes: [0, 1, 2, 3, 4, 5],
    updateFn: (field, dt) => {
      updateEnergyField(field, deepWater, dt, TRAVEL_DURATION, {
        depthDampingCoefficient: 0,
        depthDampingExponent: 1,
      });
    },
    events: [
      {
        time: 1,
        label: 'drain',
        action: (field: any) => {
          // Drain center column at multiple Y positions to create vertical stripe
          for (let y = 0; y < SMALL_HEIGHT; y++) {
            const normalizedY = y / (SMALL_HEIGHT - 1);
            drainEnergyAt(field, 0.5, normalizedY, 10.0);
          }
        },
      },
    ],
  });

  // Return a progression-like object (can't use defineProgression directly
  // because we need custom event handling)
  return {
    id: 'energy-field/with-drain',
    description: 'Energy drain at t=1s (breaking simulation) - creates gap in center column',
    initialMatrix: INITIAL_PULSE,
    captureTimes: [0, 1, 2, 3, 4, 5],
    snapshots,
    metadata: {
      drainTime: 1,
      drainColumn: 'center',
      depthDampingCoefficient: 0,
      travelDuration: TRAVEL_DURATION,
      label: 'With Drain',
    },
    at(time: number) {
      return snapshots.find((s) => s.time === time);
    },
    matrixAt(time: number) {
      const snapshot = this.at(time);
      return snapshot?.matrix ?? null;
    },
  };
})();

// ====================
// VISUAL TEST STRIPS - colocated with the data they render
// ====================

export const ENERGY_FIELD_STRIP_NO_DAMPING = {
  testId: 'strip-no-damping',
  pageId: '02-energy-field',
  snapshots: PROGRESSION_NO_DAMPING.snapshots,
};

export const ENERGY_FIELD_STRIP_LOW_DAMPING = {
  testId: 'strip-low-damping',
  pageId: '02-energy-field',
  snapshots: PROGRESSION_LOW_DAMPING.snapshots,
};

export const ENERGY_FIELD_STRIP_HIGH_DAMPING = {
  testId: 'strip-high-damping',
  pageId: '02-energy-field',
  snapshots: PROGRESSION_HIGH_DAMPING.snapshots,
};

export const ENERGY_FIELD_STRIP_WITH_DRAIN = {
  testId: 'strip-with-drain',
  pageId: '02-energy-field',
  snapshots: PROGRESSION_WITH_DRAIN.snapshots,
};

export const ENERGY_FIELD_STRIPS = [
  ENERGY_FIELD_STRIP_NO_DAMPING,
  ENERGY_FIELD_STRIP_LOW_DAMPING,
  ENERGY_FIELD_STRIP_HIGH_DAMPING,
  ENERGY_FIELD_STRIP_WITH_DRAIN,
];

export const ENERGY_FIELD_PROGRESSIONS = {
  noDamping: PROGRESSION_NO_DAMPING,
  lowDamping: PROGRESSION_LOW_DAMPING,
  highDamping: PROGRESSION_HIGH_DAMPING,
  withDrain: PROGRESSION_WITH_DRAIN,
};
