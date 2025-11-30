/**
 * High Damping - Aggressive decay
 */
import { defineProgression } from '../../../test-utils';
import { updateEnergyField } from '../model';
import { INITIAL_PULSE, TRAVEL_DURATION, shallowGradient } from '../shared';

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

export const ENERGY_FIELD_STRIP_HIGH_DAMPING = {
  testId: 'strip-high-damping',
  pageId: '02-energy-field/03-high-damping',
  snapshots: PROGRESSION_HIGH_DAMPING.snapshots,
};
