import { defineProgression } from '../../../test-utils';
import { createMatrix } from '../shared';

export const PROGRESSION_INTENSITY_DECAY = defineProgression({
  id: 'foam-dispersion/intensity-decay',
  description: 'Foam intensity decays as bubbles pop',
  initialMatrix: (() => {
    const matrix = createMatrix();
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
    const decayRate = 0.5;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Intensity Decay' },
});

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
    const decayRate = 1.5;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Fast Decay' },
});

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
    const decayRate = 0.2;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  metadata: { label: 'Slow Decay' },
});

export const FOAM_DISPERSION_STRIP_DECAY = {
  testId: 'strip-foam-decay',
  pageId: '07-foam-dispersion/01-decay-rate',
  snapshots: [PROGRESSION_FAST_DECAY, PROGRESSION_SLOW_DECAY].flatMap((prog) =>
    prog.snapshots.slice(0, 4).map((s) => ({
      ...s,
      label: `${prog.metadata.label} ${s.label}`,
    }))
  ),
};
