/**
 * Progression Framework Tests
 *
 * CRITICAL: The progression framework is the backbone of the test architecture.
 * defineProgression() creates structured test cases that power:
 * 1. Unit test assertions (data correctness)
 * 2. Visual regression tests (render correctness)
 * 3. MDX documentation (explanations)
 *
 * If defineProgression(), captureSnapshots(), or the registry are broken,
 * ALL progression-based tests become meaningless. A broken framework could:
 * - Silently skip time points
 * - Corrupt snapshot data
 * - Fail to register progressions for visual tests
 *
 * These tests must pass before any progression-based tests are trustworthy.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  defineProgression,
  captureSnapshots,
  captureWithEvents,
  getProgressionRegistry,
  getProgression,
  clearProgressionRegistry,
  matrixToField,
  fieldToMatrix,
} from './progression.js';

describe('progression framework', () => {
  // Clear registry between tests to avoid cross-contamination
  beforeEach(() => {
    clearProgressionRegistry();
  });

  describe('defineProgression', () => {
    it('creates progression with required fields', () => {
      const progression = defineProgression({
        id: 'test/basic',
        description: 'Test progression',
        initialMatrix: [
          [1, 0],
          [0, 0],
        ],
        captureTimes: [0, 1],
        updateFn: (field, _dt) => {
          // Simple propagation: copy row 0 to row 1
          field.height[field.width] = field.height[0] * 0.5;
        },
      });

      expect(progression.id).toBe('test/basic');
      expect(progression.description).toBe('Test progression');
      expect(progression.captureTimes).toEqual([0, 1]);
      expect(progression.snapshots).toHaveLength(2);
    });

    it('throws if id is missing', () => {
      expect(() =>
        defineProgression({
          description: 'No ID',
          initialMatrix: [[1]],
          updateFn: () => {},
        })
      ).toThrow('requires an id');
    });

    it('throws if initialMatrix is missing', () => {
      expect(() =>
        defineProgression({
          id: 'test/no-matrix',
          description: 'No matrix',
          updateFn: () => {},
        })
      ).toThrow('requires an initialMatrix');
    });

    it('throws if updateFn is missing', () => {
      expect(() =>
        defineProgression({
          id: 'test/no-update',
          description: 'No update function',
          initialMatrix: [[1]],
        })
      ).toThrow('requires an updateFn');
    });

    it('registers progression in global registry', () => {
      defineProgression({
        id: 'test/registered',
        description: 'Should be registered',
        initialMatrix: [[1]],
        captureTimes: [0],
        updateFn: () => {},
      });

      const registry = getProgressionRegistry();
      expect(registry.has('test/registered')).toBe(true);
    });

    it('provides at() helper to get snapshot by time', () => {
      const progression = defineProgression({
        id: 'test/at-helper',
        description: 'Test at() helper',
        initialMatrix: [
          [1, 2],
          [0, 0],
        ],
        captureTimes: [0, 1, 2],
        updateFn: () => {},
      });

      const snapshot = progression.at(1);
      expect(snapshot).toBeDefined();
      expect(snapshot.time).toBe(1);
    });

    it('provides matrixAt() helper to get matrix by time', () => {
      const progression = defineProgression({
        id: 'test/matrix-at',
        description: 'Test matrixAt() helper',
        initialMatrix: [
          [5, 5],
          [0, 0],
        ],
        captureTimes: [0],
        updateFn: () => {},
      });

      const matrix = progression.matrixAt(0);
      expect(matrix[0][0]).toBe(5);
    });

    it('stores metadata for documentation', () => {
      const progression = defineProgression({
        id: 'test/metadata',
        description: 'Has metadata',
        initialMatrix: [[1]],
        captureTimes: [0],
        updateFn: () => {},
        metadata: {
          formula: 'E = mc²',
          coefficient: 0.5,
        },
      });

      expect(progression.metadata.formula).toBe('E = mc²');
      expect(progression.metadata.coefficient).toBe(0.5);
    });
  });

  describe('captureSnapshots', () => {
    it('captures initial state at t=0', () => {
      const snapshots = captureSnapshots({
        initialMatrix: [[1, 2, 3]],
        captureTimes: [0],
        updateFn: () => {},
      });

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].time).toBe(0);
      expect(snapshots[0].matrix[0]).toEqual([1, 2, 3]);
    });

    it('runs simulation and captures at specified times', () => {
      let updateCount = 0;

      const snapshots = captureSnapshots({
        initialMatrix: [[10]],
        captureTimes: [0, 1],
        updateFn: (field, _dt) => {
          updateCount++;
          // Decay by 10% each frame
          field.height[0] *= 0.99;
        },
      });

      // Should have run ~60 updates for 1 second at 60fps
      expect(updateCount).toBeGreaterThan(50);
      expect(updateCount).toBeLessThan(70);

      // t=0 should have original value
      expect(snapshots[0].matrix[0][0]).toBe(10);

      // t=1 should show decay (10 * 0.99^60 ≈ 5.47)
      expect(snapshots[1].matrix[0][0]).toBeLessThan(10);
      expect(snapshots[1].matrix[0][0]).toBeGreaterThan(4);
    });

    it('sorts capture times', () => {
      const snapshots = captureSnapshots({
        initialMatrix: [[1]],
        captureTimes: [2, 0, 1], // Out of order
        updateFn: () => {},
      });

      expect(snapshots[0].time).toBe(0);
      expect(snapshots[1].time).toBe(1);
      expect(snapshots[2].time).toBe(2);
    });

    it('generates labels from time', () => {
      const snapshots = captureSnapshots({
        initialMatrix: [[1]],
        captureTimes: [0, 1, 2],
        updateFn: () => {},
      });

      expect(snapshots[0].label).toBe('t=0s');
      expect(snapshots[1].label).toBe('t=1s');
      expect(snapshots[2].label).toBe('t=2s');
    });

    it('handles non-integer capture times', () => {
      const snapshots = captureSnapshots({
        initialMatrix: [[1]],
        captureTimes: [0, 0.5, 1.5],
        updateFn: () => {},
      });

      expect(snapshots).toHaveLength(3);
      expect(snapshots[1].time).toBe(0.5);
      expect(snapshots[2].time).toBe(1.5);
    });
  });

  describe('captureWithEvents', () => {
    it('triggers events at specified times', () => {
      let eventFired = false;
      let eventTime = -1;

      const snapshots = captureWithEvents({
        initialMatrix: [[10, 10]],
        captureTimes: [0, 1, 2],
        updateFn: () => {},
        events: [
          {
            time: 1,
            action: (field) => {
              eventFired = true;
              eventTime = 1;
              field.height[0] = 0; // Drain left cell
            },
          },
        ],
      });

      expect(eventFired).toBe(true);
      expect(eventTime).toBe(1);

      // Before event (t=0): both cells have energy
      expect(snapshots[0].matrix[0][0]).toBe(10);

      // After event (t=1): left cell drained
      expect(snapshots[1].matrix[0][0]).toBe(0);
    });

    it('includes event label in snapshot', () => {
      const snapshots = captureWithEvents({
        initialMatrix: [[1]],
        captureTimes: [0, 1],
        updateFn: () => {},
        events: [
          {
            time: 1,
            label: 'drain',
            action: () => {},
          },
        ],
      });

      expect(snapshots[1].label).toContain('drain');
    });

    it('handles multiple events', () => {
      const eventOrder = [];

      captureWithEvents({
        initialMatrix: [[100]],
        captureTimes: [0, 1, 2, 3],
        updateFn: () => {},
        events: [
          { time: 1, action: () => eventOrder.push('first') },
          { time: 2, action: () => eventOrder.push('second') },
        ],
      });

      expect(eventOrder).toEqual(['first', 'second']);
    });

    it('sorts events by time', () => {
      const eventOrder = [];

      captureWithEvents({
        initialMatrix: [[1]],
        captureTimes: [0, 3],
        updateFn: () => {},
        events: [
          { time: 2, action: () => eventOrder.push('second') },
          { time: 1, action: () => eventOrder.push('first') },
        ],
      });

      expect(eventOrder).toEqual(['first', 'second']);
    });
  });

  describe('progression registry', () => {
    it('getProgression returns registered progression', () => {
      defineProgression({
        id: 'test/get-by-id',
        description: 'Find me',
        initialMatrix: [[1]],
        captureTimes: [0],
        updateFn: () => {},
      });

      const found = getProgression('test/get-by-id');
      expect(found).toBeDefined();
      expect(found.description).toBe('Find me');
    });

    it('getProgression returns null for unknown id', () => {
      expect(getProgression('nonexistent/id')).toBeNull();
    });

    it('clearProgressionRegistry removes all progressions', () => {
      defineProgression({
        id: 'test/to-clear',
        description: 'Will be cleared',
        initialMatrix: [[1]],
        captureTimes: [0],
        updateFn: () => {},
      });

      expect(getProgression('test/to-clear')).not.toBeNull();

      clearProgressionRegistry();

      expect(getProgression('test/to-clear')).toBeNull();
      expect(getProgressionRegistry().size).toBe(0);
    });

    it('overwrites progression with same id', () => {
      defineProgression({
        id: 'test/overwrite',
        description: 'Original',
        initialMatrix: [[1]],
        captureTimes: [0],
        updateFn: () => {},
      });

      defineProgression({
        id: 'test/overwrite',
        description: 'Replacement',
        initialMatrix: [[2]],
        captureTimes: [0],
        updateFn: () => {},
      });

      const found = getProgression('test/overwrite');
      expect(found.description).toBe('Replacement');
      expect(found.initialMatrix[0][0]).toBe(2);
    });
  });

  describe('re-exported utilities', () => {
    it('exports matrixToField from progression.js', () => {
      const field = matrixToField([
        [1, 2],
        [3, 4],
      ]);
      expect(field.width).toBe(2);
      expect(field.gridHeight).toBe(2);
    });

    it('exports fieldToMatrix from progression.js', () => {
      const field = {
        height: new Float32Array([1, 2, 3, 4]),
        velocity: new Float32Array(4),
        width: 2,
        gridHeight: 2,
      };
      const matrix = fieldToMatrix(field);
      expect(matrix).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });

  describe('integration: realistic progression', () => {
    it('simulates energy propagation correctly', () => {
      // Simplified version of the actual energy field propagation
      const progression = defineProgression({
        id: 'test/propagation',
        description: 'Energy moves from row 0 to row 1',
        initialMatrix: [
          [1.0, 1.0], // row 0: initial energy
          [0.0, 0.0], // row 1: empty
        ],
        captureTimes: [0, 1],
        updateFn: (field, dt) => {
          // Simple propagation: blend row 1 with row 0
          const blendRate = 1.0; // 100% blend per second
          const blend = Math.min(1, blendRate * dt);

          for (let x = 0; x < field.width; x++) {
            const row0 = field.height[x];
            const row1 = field.height[field.width + x];

            // Row 1 receives energy from row 0
            field.height[field.width + x] = row1 * (1 - blend) + row0 * blend;

            // Row 0 fades
            field.height[x] *= 1 - blend * 0.5;
          }
        },
      });

      const t0 = progression.matrixAt(0);
      const t1 = progression.matrixAt(1);

      // t=0: energy only in row 0
      expect(t0[0][0]).toBe(1.0);
      expect(t0[1][0]).toBe(0.0);

      // t=1: energy has propagated to row 1, row 0 has faded
      expect(t1[0][0]).toBeLessThan(1.0); // Row 0 faded
      expect(t1[1][0]).toBeGreaterThan(0.0); // Row 1 received energy
    });
  });
});
