import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEnergyField,
  createSwellSource,
  injectSwells,
  updateEnergyField,
  getHeightAt,
  drainEnergyAt,
  injectWavePulse,
  resetRowAccumulator,
  FIELD_WIDTH,
  FIELD_HEIGHT,
} from './model.js';

describe('energyFieldModel', () => {
  beforeEach(() => {
    resetRowAccumulator();
  });

  describe('createEnergyField', () => {
    it('creates field with correct dimensions', () => {
      const field = createEnergyField();

      expect(field.width).toBe(FIELD_WIDTH);
      expect(field.gridHeight).toBe(FIELD_HEIGHT);
      expect(field.height.length).toBe(FIELD_WIDTH * FIELD_HEIGHT);
      expect(field.velocity.length).toBe(FIELD_WIDTH * FIELD_HEIGHT);
    });

    it('initializes height and velocity to zero', () => {
      const field = createEnergyField();

      // Check a few samples
      expect(field.height[0]).toBe(0);
      expect(field.height[field.height.length - 1]).toBe(0);
      expect(field.velocity[0]).toBe(0);
    });
  });

  describe('injectSwells', () => {
    it('injects energy at horizon row (y=0)', () => {
      const field = createEnergyField();
      const swells = [createSwellSource(10, 1.0, 0)];

      // At time 0 with phase 0, sin(0) = 0
      injectSwells(field, swells, 0);
      expect(field.height[0]).toBeCloseTo(0, 5);

      // At time = period/4, sin(π/2) = 1
      injectSwells(field, swells, 2.5); // period=10, so 2.5 = quarter period
      expect(field.height[0]).toBeCloseTo(1.0, 5);
    });

    it('sums multiple swells', () => {
      const field = createEnergyField();
      const swells = [
        createSwellSource(10, 0.5, 0),
        createSwellSource(10, 0.3, 0), // Same phase, same period
      ];

      // At quarter period, both peaks align
      injectSwells(field, swells, 2.5);
      expect(field.height[0]).toBeCloseTo(0.8, 5);
    });
  });

  describe('updateEnergyField', () => {
    it('propagates energy from horizon toward shore', () => {
      const field = createEnergyField();
      const getDepth = () => 10;
      const travelDuration = 12;

      // Inject a pulse at horizon
      for (let x = 0; x < field.width; x++) {
        field.height[x] = 1.0;
      }

      // Run 1 second of updates - should shift ~3 rows (40 rows / 12 sec)
      for (let i = 0; i < 60; i++) {
        updateEnergyField(field, getDepth, 1 / 60, travelDuration);
      }

      // Energy should have propagated to row 3
      const row3Idx = 3 * field.width + Math.floor(field.width / 2);
      expect(field.height[row3Idx]).toBeGreaterThan(0);
    });

    it('waves propagate uniformly across x (no refraction currently)', () => {
      const field = createEnergyField();

      // Inject pulse at horizon
      for (let x = 0; x < field.width; x++) {
        field.height[x] = 1.0;
      }

      const getDepth = () => 10;

      // Run updates
      for (let i = 0; i < 30; i++) {
        updateEnergyField(field, getDepth, 0.1);
      }

      // Sample energy at row 10, left vs right - should be similar
      const leftIdx = 10 * field.width + 10;
      const rightIdx = 10 * field.width + 50;

      // Both sides should have similar energy (uniform propagation)
      expect(Math.abs(field.height[leftIdx])).toBeCloseTo(Math.abs(field.height[rightIdx]), 2);
    });
  });

  describe('getHeightAt', () => {
    it('returns height at grid points', () => {
      const field = createEnergyField();

      // Set a known value
      field.height[0] = 5.0;

      expect(getHeightAt(field, 0, 0)).toBe(5.0);
    });

    it('interpolates between grid points', () => {
      const field = createEnergyField();

      // Set corners of a 2x2 region
      field.height[0] = 0;
      field.height[1] = 2;
      field.height[field.width] = 2;
      field.height[field.width + 1] = 4;

      // Center should interpolate
      const centerX = 0.5 / (field.width - 1);
      const centerY = 0.5 / (field.gridHeight - 1);
      const centerHeight = getHeightAt(field, centerX, centerY);

      // Average of 0, 2, 2, 4 = 2
      expect(centerHeight).toBeCloseTo(2, 1);
    });
  });

  describe('drainEnergyAt (Plan 141)', () => {
    it('returns amount of energy actually drained', () => {
      const field = createEnergyField();

      // Set energy at a point
      field.height[0] = 1.0;

      // Drain 0.3 energy
      const drained = drainEnergyAt(field, 0, 0, 0.3);

      expect(drained).toBeCloseTo(0.3, 5);
      expect(field.height[0]).toBeCloseTo(0.7, 5);
    });

    it('returns less than requested if not enough energy', () => {
      const field = createEnergyField();

      // Set low energy
      field.height[0] = 0.2;

      // Try to drain more than available
      const drained = drainEnergyAt(field, 0, 0, 0.5);

      expect(drained).toBeCloseTo(0.2, 5); // Only 0.2 was available
      expect(field.height[0]).toBe(0); // Now empty
    });

    it('returns 0 when draining empty cell', () => {
      const field = createEnergyField();

      // Cell is already empty (initialized to 0)
      const drained = drainEnergyAt(field, 0.5, 0.5, 0.5);

      expect(drained).toBe(0);
    });

    it('drains at correct position in field', () => {
      const field = createEnergyField();

      // Fill entire field
      for (let i = 0; i < field.height.length; i++) {
        field.height[i] = 1.0;
      }

      // Drain at center
      drainEnergyAt(field, 0.5, 0.5, 0.5);

      // Check that energy was drained from the right place
      const centerX = Math.floor(0.5 * field.width);
      const centerY = Math.floor(0.5 * field.gridHeight);
      const centerIdx = centerY * field.width + centerX;

      expect(field.height[centerIdx]).toBeCloseTo(0.5, 5);
    });
  });

  describe('injectWavePulse', () => {
    it('adds energy across the horizon row', () => {
      const field = createEnergyField();

      injectWavePulse(field, 0.8);

      // Check several points along horizon
      expect(field.height[0]).toBeCloseTo(0.8, 5);
      expect(field.height[field.width / 2]).toBeCloseTo(0.8, 5);
      expect(field.height[field.width - 1]).toBeCloseTo(0.8, 5);
    });

    it('accumulates with existing energy', () => {
      const field = createEnergyField();

      // First pulse
      injectWavePulse(field, 0.5);
      // Second pulse
      injectWavePulse(field, 0.3);

      expect(field.height[0]).toBeCloseTo(0.8, 5);
    });
  });

  describe('Energy drains after wave breaking (Plan 141 integration)', () => {
    it('wave energy decreases when drained at sandbar position', () => {
      const field = createEnergyField();
      const getDepth = () => 10;
      const travelDuration = 12;

      // Inject a pulse at horizon
      injectWavePulse(field, 1.0);

      // Propagate energy to middle of field
      for (let i = 0; i < 120; i++) {
        // 2 seconds at 60fps
        updateEnergyField(field, getDepth, 1 / 60, travelDuration);
      }

      // Energy should have propagated to around row 6
      const midY = 6 / field.gridHeight;
      const energyBefore = getHeightAt(field, 0.5, midY);
      expect(energyBefore).toBeGreaterThan(0);

      // Drain energy at multiple X positions (simulating breaking across width)
      for (let x = 0.3; x <= 0.7; x += 0.1) {
        drainEnergyAt(field, x, midY, 0.5);
      }

      // Energy at drained positions should be lower
      const energyAfter = getHeightAt(field, 0.5, midY);
      expect(energyAfter).toBeLessThan(energyBefore);
    });
  });
});
