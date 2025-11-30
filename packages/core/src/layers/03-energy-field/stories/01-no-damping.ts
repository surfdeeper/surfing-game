/**
 * No Damping (Deep Water) - Energy translates as a sharp line
 */
import { defineProgression } from '../../../test-utils';
import { updateDeepWaterTranslation, INITIAL_PULSE, TRAVEL_DURATION } from '../shared';

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

export const ENERGY_FIELD_STRIP_NO_DAMPING = {
  testId: 'strip-no-damping',
  pageId: '02-energy-field/01-no-damping',
  snapshots: PROGRESSION_NO_DAMPING.snapshots,
};
