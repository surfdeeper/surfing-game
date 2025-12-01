import { defineStory, asciiToMatrix } from '../../../test-utils';
import { updateEnergyField } from '../model';
import { TRAVEL_DURATION, shallowGradient } from '../shared';

const story = defineStory({
  id: 'energy-field/low-damping',
  title: 'Low Damping',
  prose: 'Low damping - subtle decay near shore.',
  // TODO: Add energy pulse layer and import from there instead of inline
  initialMatrix: asciiToMatrix(`
FFFFF
-----
-----
-----
-----
-----`),
  assertInitialAscii: `
    FFFFF
    -----
    -----
    -----
    -----
    -----
  `,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateEnergyField(field, shallowGradient, dt, TRAVEL_DURATION, {
      depthDampingCoefficient: 0.05,
      depthDampingExponent: 2.0,
    });
  },
  expectedAscii: `
    t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
    FFFFF  BBBBB  44444  22222  11111  11111
    -----  AAAAA  AAAAA  44444  22222  22222
    -----  22222  44444  44444  33333  22222
    -----  11111  22222  33333  44444  33333
    -----  -----  11111  22222  33333  33333
    -----  -----  -----  11111  22222  33333
  `,
});

export default story;
export const PROGRESSION_LOW_DAMPING = story.progression;

export const ENERGY_FIELD_STRIP_LOW_DAMPING = {
  testId: 'strip-low-damping',
  pageId: '02-energy-field/02-low-damping',
  snapshots: story.progression.snapshots,
};
