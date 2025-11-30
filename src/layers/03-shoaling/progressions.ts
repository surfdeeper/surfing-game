import { defineProgression } from '../../test-utils';

type Matrix = number[][];

const GRID_WIDTH = 8;
const GRID_HEIGHT = 10;

function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Shoaling progressions show wave transformation as waves enter shallow water.
 *
 * Physical effects modeled:
 * - Wave height increases as depth decreases (energy conservation)
 * - Wavelength shortens (waves "stack up")
 * - Wave speed decreases (c = sqrt(g*d))
 *
 * Field structure:
 * - field.gridHeight = number of rows
 * - field.width = number of columns
 * - field.height = Float32Array with the data
 */

// Simple wave propagation with height increase due to shoaling
export const PROGRESSION_WAVE_SHOALING = defineProgression({
  id: 'shoaling/wave-transformation',
  description: 'Wave height increases as depth decreases',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Initial wave pulse at horizon (row 0-1) with moderate height
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.4; // Moderate amplitude in deep water
      matrix[1][col] = 0.2;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height; // Float32Array

    // Shoaling factor: waves grow as they approach shore
    // Real physics: H2/H1 = (d1/d2)^0.25 (Green's law)
    // Simplified: energy increases proportional to row (shallower = higher)
    const shoalingRate = 1.5; // Growth factor per second

    // Work backwards to avoid overwriting
    for (let row = rows - 1; row > 0; row--) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;
        const srcEnergy = data[srcIdx];

        // Propagate with shoaling amplification
        const depthFactor = 1 + (row / rows) * 0.5; // Shallower = more amplification
        data[idx] = Math.min(1.0, srcEnergy * (1 + shoalingRate * dt * depthFactor));
      }
    }

    // Decay source row
    for (let col = 0; col < cols; col++) {
      data[col] *= 0.5;
    }
  },
  metadata: { label: 'Wave Shoaling' },
});

// Wavelength compression - waves "stack up" as they slow
export const PROGRESSION_WAVELENGTH_COMPRESSION = defineProgression({
  id: 'shoaling/wavelength-compression',
  description: 'Wavelength shortens as waves enter shallow water',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Two wave peaks in deep water, spread apart
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.6;
      matrix[3][col] = 0.6; // Second wave 3 rows behind
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    // Waves slow down as they approach shore
    // Deep water: full speed, Shallow: half speed
    // This causes compression (waves stack up)

    for (let row = rows - 1; row > 0; row--) {
      const speedFactor = 1 - (row / rows) * 0.5; // Slower in shallow water

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        // Blend with speed-based weight
        const blend = speedFactor * dt * 2;
        data[idx] = data[idx] * (1 - blend) + data[srcIdx] * blend;
      }
    }

    // Slowly decay horizon
    for (let col = 0; col < cols; col++) {
      data[col] *= 0.9;
    }
  },
  metadata: { label: 'Wavelength Compression' },
});

// Orbital motion flattening - circular orbits become elliptical
export const PROGRESSION_ORBITAL_FLATTENING = defineProgression({
  id: 'shoaling/orbital-flattening',
  description: 'Circular particle orbits flatten into ellipses in shallow water',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Gradient showing vertical motion amplitude
    // Deep water: full vertical range, Shallow: reduced vertical, increased horizontal
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = 1 - row / (GRID_HEIGHT - 1);
      for (let col = 0; col < GRID_WIDTH; col++) {
        // Vertical amplitude decreases with depth
        matrix[row][col] = depth * 0.8;
      }
    }
    return matrix;
  })(),
  captureTimes: [0], // Static visualization
  updateFn: () => {}, // No update - static display
  metadata: { label: 'Orbital Flattening' },
});

// Speed gradient visualization
export const PROGRESSION_SPEED_GRADIENT = defineProgression({
  id: 'shoaling/speed-gradient',
  description: 'Wave speed decreases with depth (c = sqrt(g*d))',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Show speed as intensity: bright = fast, dark = slow
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = 1 - row / (GRID_HEIGHT - 1);
      const speed = Math.sqrt(depth); // c = sqrt(g*d), normalized
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = speed;
      }
    }
    return matrix;
  })(),
  captureTimes: [0], // Static visualization
  updateFn: () => {},
  metadata: { label: 'Speed vs Depth' },
});

// Combined effect - full shoaling simulation
export const PROGRESSION_SHOALING_COMBINED = defineProgression({
  id: 'shoaling/combined',
  description: 'Full shoaling: height increase + speed decrease + compression',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Single wave pulse
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.5;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5, 6, 7],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    // Combined shoaling effects:
    // 1. Propagation with speed decrease
    // 2. Height amplification
    // 3. Wavelength compression (implicit from slowing)

    for (let row = rows - 1; row > 0; row--) {
      const depth = 1 - row / (rows - 1);
      const speed = Math.sqrt(Math.max(0.1, depth)); // c ~ sqrt(d)
      const shoaling = Math.pow(depth, -0.25); // Green's law: H ~ d^-0.25

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;

        // Propagate with speed-dependent rate
        const propagation = speed * dt * 2;
        const srcValue = data[srcIdx] * shoaling; // Amplify

        data[idx] = Math.min(1.0, data[idx] * (1 - propagation) + srcValue * propagation);
      }
    }

    // Decay source
    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  metadata: { label: 'Combined Effects' },
});

export const SHOALING_PROGRESSIONS = {
  waveShoaling: PROGRESSION_WAVE_SHOALING,
  wavelengthCompression: PROGRESSION_WAVELENGTH_COMPRESSION,
  orbitalFlattening: PROGRESSION_ORBITAL_FLATTENING,
  speedGradient: PROGRESSION_SPEED_GRADIENT,
  combined: PROGRESSION_SHOALING_COMBINED,
};

// Visual test strips - colocated with the data they render

export const SHOALING_STRIP_HEIGHT = {
  testId: 'strip-shoaling-height',
  pageId: '03-shoaling',
  snapshots: PROGRESSION_WAVE_SHOALING.snapshots,
};

export const SHOALING_STRIP_COMPRESSION = {
  testId: 'strip-shoaling-compression',
  pageId: '03-shoaling',
  snapshots: PROGRESSION_WAVELENGTH_COMPRESSION.snapshots,
};

export const SHOALING_STRIP_STATIC = {
  testId: 'strip-shoaling-static',
  pageId: '03-shoaling',
  snapshots: [PROGRESSION_ORBITAL_FLATTENING, PROGRESSION_SPEED_GRADIENT].map((prog) => ({
    ...prog.snapshots[0],
    label: prog.metadata.label,
  })),
};

export const SHOALING_STRIP_COMBINED = {
  testId: 'strip-shoaling-combined',
  pageId: '03-shoaling',
  snapshots: PROGRESSION_SHOALING_COMBINED.snapshots,
};

// All strips for this layer
export const SHOALING_STRIPS = [
  SHOALING_STRIP_HEIGHT,
  SHOALING_STRIP_COMPRESSION,
  SHOALING_STRIP_STATIC,
  SHOALING_STRIP_COMBINED,
];
