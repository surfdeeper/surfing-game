/**
 * Energy Field Propagation Tests
 *
 * These tests validate the progression data defined in energyFieldProgressions.ts
 */
import { describe, it, expect } from 'vitest';
import { updateEnergyField } from './model.js';
import {
  matrixToField,
  fieldToMatrix,
  matrixTotalEnergy,
  matrixPeakRow,
  progressionToAscii,
} from '../../test-utils/index.js';

// Import progressions from individual story files
import { PROGRESSION_NO_DAMPING } from './stories/01-no-damping';
import { PROGRESSION_LOW_DAMPING } from './stories/02-low-damping';
import { PROGRESSION_HIGH_DAMPING } from './stories/03-high-damping';
import { PROGRESSION_WITH_DRAIN } from './stories/04-with-drain';

// Standard initial state for legacy tests
const INITIAL_PULSE = [
  [1.0, 1.0, 1.0, 1.0, 1.0], // row 0 (horizon) - pulse
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 1
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 2
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 3
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 4
  [0.0, 0.0, 0.0, 0.0, 0.0], // row 5 (shore)
];

const deepWater = () => 10;

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

    it('t=1s: energy has moved to row 1', () => {
      const matrix = progression.matrixAt(1);

      // Sharp line should now be at row 1
      expect(matrix[0][2]).toBe(0); // Horizon cleared
      expect(matrix[1][2]).toBe(1.0); // Row 1 has full energy
      expect(matrix[2][2]).toBe(0); // Row 2 still empty
    });

    it('t=3s: energy is at row 3', () => {
      const matrix = progression.matrixAt(3);

      // Sharp line should be at row 3
      expect(matrix[0][2]).toBe(0); // Horizon empty
      expect(matrix[2][2]).toBe(0); // Row 2 empty
      expect(matrix[3][2]).toBe(1.0); // Row 3 has full energy
      expect(matrix[4][2]).toBe(0); // Row 4 still empty
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
      const matrix = PROGRESSION_LOW_DAMPING.matrixAt(4);

      // Energy should be weaker near shore due to shallow water damping
      const midEnergy = matrix[3][2];
      const shoreEnergy = matrix[5][2];

      expect(shoreEnergy).toBeLessThan(midEnergy);
    });

    it('higher damping coefficient = faster decay', () => {
      const lowDampingTotal = matrixTotalEnergy(PROGRESSION_LOW_DAMPING.matrixAt(3));
      const highDampingTotal = matrixTotalEnergy(PROGRESSION_HIGH_DAMPING.matrixAt(3));

      expect(highDampingTotal).toBeLessThan(lowDampingTotal);
    });

    it('high damping produces empty bottom row at t=5s', () => {
      const highT5 = PROGRESSION_HIGH_DAMPING.matrixAt(5);
      const bottomRow = highT5[5];

      // All values should be near zero (< 0.05 maps to '-' in ASCII)
      for (const val of bottomRow) {
        expect(val).toBeLessThan(0.05);
      }
    });

    it('low damping produces non-empty bottom row at t=5s', () => {
      const lowT5 = PROGRESSION_LOW_DAMPING.matrixAt(5);
      const bottomRow = lowT5[5];

      // Values should be around 0.25-0.3 (maps to '3' in ASCII)
      for (const val of bottomRow) {
        expect(val).toBeGreaterThan(0.2);
      }
    });

    it('no damping preserves total energy across time', () => {
      // Deep water translation preserves energy perfectly
      const t0Total = matrixTotalEnergy(PROGRESSION_NO_DAMPING.matrixAt(0));
      const t3Total = matrixTotalEnergy(PROGRESSION_NO_DAMPING.matrixAt(3));

      expect(t3Total).toBe(t0Total); // Energy conserved exactly
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
    // Deep water: sharp line translates down one row per second
    const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  -----  -----  -----  -----  -----
-----  FFFFF  -----  -----  -----  -----
-----  -----  FFFFF  -----  -----  -----
-----  -----  -----  FFFFF  -----  -----
-----  -----  -----  -----  FFFFF  -----
-----  -----  -----  -----  -----  FFFFF
`.trim();
    expect(progressionToAscii(PROGRESSION_NO_DAMPING.snapshots)).toBe(expected);
  });

  it('PROGRESSION_LOW_DAMPING produces expected matrices', () => {
    // Low damping (coefficient 0.05): subtle fade near shore
    const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  BBBBB  44444  22222  11111  11111
-----  AAAAA  AAAAA  44444  22222  22222
-----  22222  44444  44444  33333  22222
-----  11111  22222  33333  44444  33333
-----  -----  11111  22222  33333  33333
-----  -----  -----  11111  22222  33333
`.trim();
    expect(progressionToAscii(PROGRESSION_LOW_DAMPING.snapshots)).toBe(expected);
  });

  it('PROGRESSION_HIGH_DAMPING produces expected matrices', () => {
    // High damping (coefficient 2.0): aggressive decay, bottom row empty
    const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  BBBBB  44444  22222  11111  11111
-----  AAAAA  AAAAA  33333  22222  11111
-----  22222  44444  44444  33333  22222
-----  11111  22222  33333  33333  33333
-----  -----  11111  22222  22222  22222
-----  -----  -----  -----  -----  -----
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
// LEGACY EXPORTS (for backward compatibility)
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
  const snapshots: Array<{ time: number; matrix: number[][] }> = [];
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

// Re-export progressions for backward compatibility
export {
  PROGRESSION_NO_DAMPING,
  PROGRESSION_LOW_DAMPING,
  PROGRESSION_HIGH_DAMPING,
  PROGRESSION_WITH_DRAIN,
};
