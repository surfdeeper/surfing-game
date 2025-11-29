/**
 * Energy Field Propagation Tests
 *
 * These tests use defineProgression() to create structured test cases that can be:
 * 1. Asserted on in unit tests (data correctness)
 * 2. Rendered for visual regression tests (render correctness)
 * 3. Displayed in MDX documentation (explanation)
 */
import { describe, it, expect } from 'vitest';
import { updateEnergyField, drainEnergyAt } from './energyFieldModel.js';
import {
  defineProgression,
  captureWithEvents,
  matrixToField,
  fieldToMatrix,
  matrixTotalEnergy,
  matrixPeakRow,
  progressionToAscii,
} from '../test-utils/index.js';

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
const shallowGradient = (normalizedX, normalizedY) => {
  // depth = 10 at horizon (y=0), depth = 0.5 at shore (y=1)
  return 10 - normalizedY * 9.5;
};

// Standard travel duration (6 rows in 6 seconds = 1 row/sec)
const TRAVEL_DURATION = 6;

// ====================
// PROGRESSION DEFINITIONS
// ====================

/**
 * No damping (deep water) - energy maintains magnitude as it travels
 */
export const PROGRESSION_NO_DAMPING = defineProgression({
  id: 'energy-field/no-damping',
  description: 'No damping (deep water) - energy maintains magnitude as it travels',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateEnergyField(field, deepWater, dt, TRAVEL_DURATION, {
      depthDampingCoefficient: 0,
      depthDampingExponent: 1,
    });
  },
  metadata: {
    depthDampingCoefficient: 0,
    depthDampingExponent: 1,
    depthFn: 'deep water (constant 10m)',
    travelDuration: TRAVEL_DURATION,
  },
});

/**
 * With damping (shallow water gradient) - energy decays in shallow water
 */
export const PROGRESSION_WITH_DAMPING = defineProgression({
  id: 'energy-field/with-damping',
  description: 'Moderate damping (shallow water gradient) - energy decays near shore',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateEnergyField(field, shallowGradient, dt, TRAVEL_DURATION, {
      depthDampingCoefficient: 0.1,
      depthDampingExponent: 2.0,
    });
  },
  metadata: {
    depthDampingCoefficient: 0.1,
    depthDampingExponent: 2.0,
    depthFn: 'shallow gradient (10m horizon to 0.5m shore)',
    formula: 'energy *= exp(-coefficient * dt / depth^exponent)',
    travelDuration: TRAVEL_DURATION,
  },
});

/**
 * High damping - aggressive decay for comparison
 */
export const PROGRESSION_HIGH_DAMPING = defineProgression({
  id: 'energy-field/high-damping',
  description: 'High damping - aggressive decay for comparison',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateEnergyField(field, shallowGradient, dt, TRAVEL_DURATION, {
      depthDampingCoefficient: 0.2,
      depthDampingExponent: 2.0,
    });
  },
  metadata: {
    depthDampingCoefficient: 0.2,
    depthDampingExponent: 2.0,
    depthFn: 'shallow gradient (10m horizon to 0.5m shore)',
    travelDuration: TRAVEL_DURATION,
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
        action: (field) => {
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
    },
    at(time) {
      return snapshots.find((s) => s.time === time);
    },
    matrixAt(time) {
      const snapshot = this.at(time);
      return snapshot?.matrix ?? null;
    },
  };
})();

// ====================
// UNIT TESTS
// ====================

describe('Energy Field Propagation - Using defineProgression()', () => {
  describe('Basic propagation (deep water, no damping)', () => {
    const progression = PROGRESSION_NO_DAMPING;

    it('t=0: initial pulse at horizon', () => {
      const matrix = progression.matrixAt(0);
      expect(matrix).toEqual(INITIAL_PULSE);
    });

    it('t=1s: energy begins propagating downward', () => {
      const matrix = progression.matrixAt(1);

      // Energy should have spread to row 1
      expect(matrix[0][2]).toBeLessThan(1.0); // Horizon fading
      expect(matrix[1][2]).toBeGreaterThan(0.3); // Row 1 has energy
      expect(matrix[2][2]).toBeGreaterThan(0); // Row 2 starting to get energy
    });

    it('t=3s: energy band in middle of field', () => {
      const matrix = progression.matrixAt(3);

      // Energy should be concentrated around rows 2-3
      expect(matrix[0][2]).toBeLessThan(0.3); // Horizon mostly faded
      expect(matrix[2][2]).toBeGreaterThan(0.2); // Mid-field has energy
      expect(matrix[3][2]).toBeGreaterThan(0.2);
      expect(matrix[5][2]).toBeLessThan(0.3); // Not yet at shore
    });

    it('energy peak moves toward shore over time', () => {
      // Track where the peak energy row is at each time
      const peakRows = progression.snapshots.map((s) => matrixPeakRow(s.matrix));

      // Peak should generally move from row 0 toward shore
      expect(peakRows[0]).toBe(0); // t=0: horizon
      expect(peakRows[3]).toBeGreaterThan(peakRows[0]); // t=3: moved down
    });
  });

  describe('Depth-based damping (shallow water decay)', () => {
    it('energy fades before reaching shore with damping', () => {
      const matrix = PROGRESSION_WITH_DAMPING.matrixAt(4);

      // Energy should be weaker near shore due to shallow water damping
      const midEnergy = matrix[3][2];
      const shoreEnergy = matrix[5][2];

      expect(shoreEnergy).toBeLessThan(midEnergy);
    });

    it('higher damping coefficient = faster decay', () => {
      const lowDampingTotal = matrixTotalEnergy(PROGRESSION_WITH_DAMPING.matrixAt(3));
      const highDampingTotal = matrixTotalEnergy(PROGRESSION_HIGH_DAMPING.matrixAt(3));

      expect(highDampingTotal).toBeLessThan(lowDampingTotal);
    });

    it('no damping preserves more total energy', () => {
      const noDampingTotal = matrixTotalEnergy(PROGRESSION_NO_DAMPING.matrixAt(3));
      const withDampingTotal = matrixTotalEnergy(PROGRESSION_WITH_DAMPING.matrixAt(3));

      expect(noDampingTotal).toBeGreaterThan(withDampingTotal);
    });
  });

  describe('Energy drain (breaking simulation)', () => {
    it('draining creates visible gap in energy band', () => {
      const matrixAtDrain = PROGRESSION_WITH_DRAIN.matrixAt(1);

      // Center column should be drained
      expect(matrixAtDrain[0][2]).toBe(0); // Center drained
      expect(matrixAtDrain[1][2]).toBe(0); // Center drained
    });

    it('gap persists as energy propagates', () => {
      const matrixAfter = PROGRESSION_WITH_DRAIN.matrixAt(3);

      // The gap should still be visible in the center
      // (edges have more energy than center in same row)
      expect(matrixAfter[2][0]).toBeGreaterThan(matrixAfter[2][2]);
      expect(matrixAfter[2][4]).toBeGreaterThan(matrixAfter[2][2]);
    });
  });
});

// ====================
// MATRIX DATA VERIFICATION (Phase 1.5)
// Compact ASCII format inspired by RxJS marble testing.
// Each character represents energy level: - = 0, 1-4 = 0.1-0.4, A-B = 0.5-0.6, F = 1.0
// ====================

describe('Matrix data verification (visual test prerequisites)', () => {
  // ASCII format: rows are horizon→shore, columns are time frames
  // Energy starts at horizon (row 0) and propagates toward shore (row 5)

  it('PROGRESSION_NO_DAMPING produces expected matrices', () => {
    // Deep water: energy maintains magnitude as it travels
    const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  BBBBB  44444  22222  11111  11111
-----  AAAAA  AAAAA  44444  22222  22222
-----  22222  44444  44444  33333  22222
-----  11111  22222  33333  44444  33333
-----  -----  11111  22222  33333  33333
-----  -----  -----  11111  22222  33333
`.trim();
    expect(progressionToAscii(PROGRESSION_NO_DAMPING.snapshots)).toBe(expected);
  });

  it('PROGRESSION_WITH_DAMPING produces expected matrices', () => {
    // Shallow water gradient: energy decays near shore
    const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  BBBBB  44444  22222  11111  11111
-----  AAAAA  AAAAA  44444  22222  22222
-----  22222  44444  44444  33333  22222
-----  11111  22222  33333  44444  33333
-----  -----  11111  22222  33333  33333
-----  -----  -----  11111  22222  22222
`.trim();
    expect(progressionToAscii(PROGRESSION_WITH_DAMPING.snapshots)).toBe(expected);
  });

  it('PROGRESSION_HIGH_DAMPING produces expected matrices', () => {
    // Aggressive decay: compare shore row (row 5) with moderate damping
    const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  BBBBB  44444  22222  11111  11111
-----  AAAAA  AAAAA  44444  22222  22222
-----  22222  44444  44444  33333  22222
-----  11111  22222  33333  44444  33333
-----  -----  11111  22222  33333  33333
-----  -----  -----  11111  11111  22222
`.trim();
    expect(progressionToAscii(PROGRESSION_HIGH_DAMPING.snapshots)).toBe(expected);
  });

  it('PROGRESSION_WITH_DRAIN produces expected matrices', () => {
    // Drain at t=1s creates gap (-) in center column that persists
    const expected = `
t=0s   t=1s (drain)t=2s   t=3s   t=4s   t=5s
FFFFF  BB-BB  44-44  22-22  11-11  11-11
-----  AA-AA  AA-AA  44-44  22-22  22-22
-----  22-22  44-44  44-44  33-33  22-22
-----  11-11  22-22  33-33  44-44  33-33
-----  -----  11-11  22-22  33-33  33-33
-----  -----  -----  11-11  22-22  33-33
`.trim();
    expect(progressionToAscii(PROGRESSION_WITH_DRAIN.snapshots)).toBe(expected);
  });
});

// ====================
// LEGACY EXPORTS (for backward compatibility with existing stories)
// ====================

/**
 * Legacy captureProgression function - wraps defineProgression for compatibility
 * @deprecated Use defineProgression() instead
 */
export function captureProgression(options: Record<string, any> = {}) {
  const {
    depthDampingCoefficient = 0,
    depthDampingExponent = 1,
    depthFn = deepWater,
    travelDuration = 6,
    captureTimesSeconds = [0, 1, 2, 3, 4, 5],
  } = options;

  const field = matrixToField(INITIAL_PULSE);
  const snapshots = [];
  let currentTime = 0;
  let captureIdx = 0;

  // Capture t=0
  if (captureTimesSeconds[0] === 0) {
    snapshots.push({ time: 0, matrix: fieldToMatrix(field) });
    captureIdx++;
  }

  // Run simulation
  const dt = 1 / 60;
  while (captureIdx < captureTimesSeconds.length) {
    updateEnergyField(field, depthFn, dt, travelDuration, {
      depthDampingCoefficient,
      depthDampingExponent,
    });
    currentTime += dt;

    // Check if we've reached next capture time
    if (currentTime >= captureTimesSeconds[captureIdx] - dt / 2) {
      snapshots.push({
        time: captureTimesSeconds[captureIdx],
        matrix: fieldToMatrix(field),
      });
      captureIdx++;
    }
  }

  return snapshots;
}
