/**
 * Low Damping - Subtle decay in shallow water
 */
import { defineProgression } from '../../../test-utils';
import { updateEnergyField } from '../model';
import { INITIAL_PULSE, TRAVEL_DURATION, shallowGradient } from '../shared';

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

export const ENERGY_FIELD_STRIP_LOW_DAMPING = {
  testId: 'strip-low-damping',
  pageId: '02-energy-field/02-low-damping',
  snapshots: PROGRESSION_LOW_DAMPING.snapshots,
};
