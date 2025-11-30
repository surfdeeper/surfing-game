/**
 * Speed vs Depth - Static visualizations of orbital flattening and speed gradient
 */
import { defineProgression } from '../../../test-utils';
import { GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../shared';

// Orbital motion flattening - circular orbits become elliptical
export const PROGRESSION_ORBITAL_FLATTENING = defineProgression({
  id: 'shoaling/orbital-flattening',
  description: 'Circular particle orbits flatten into ellipses in shallow water',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = 1 - row / (GRID_HEIGHT - 1);
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth * 0.8;
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'Orbital Flattening' },
});

// Speed gradient visualization
export const PROGRESSION_SPEED_GRADIENT = defineProgression({
  id: 'shoaling/speed-gradient',
  description: 'Wave speed decreases with depth (c = sqrt(g*d))',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = 1 - row / (GRID_HEIGHT - 1);
      const speed = Math.sqrt(depth);
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = speed;
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  updateFn: () => {},
  metadata: { label: 'Speed vs Depth' },
});

export const SHOALING_STRIP_STATIC = {
  testId: 'strip-shoaling-static',
  pageId: '03-shoaling/03-speed-vs-depth',
  snapshots: [PROGRESSION_ORBITAL_FLATTENING, PROGRESSION_SPEED_GRADIENT].map((prog) => ({
    ...prog.snapshots[0],
    label: prog.metadata.label,
  })),
};
