import { defineStory } from '../../../test-utils';
import { updateEnergyField } from '../model';
import { INITIAL_PULSE, TRAVEL_DURATION, shallowGradient } from '../shared';

const story = defineStory({
  id: 'energy-field/high-damping',
  title: 'High Damping',
  prose: 'High damping - energy mostly gone before reaching shore.',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateEnergyField(field, shallowGradient, dt, TRAVEL_DURATION, {
      depthDampingCoefficient: 2.0,
      depthDampingExponent: 2.0,
    });
  },
  expectedAscii: `
    t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
    FFFFF  BBBBB  44444  22222  11111  11111
    -----  AAAAA  AAAAA  33333  22222  11111
    -----  22222  44444  44444  33333  22222
    -----  11111  22222  33333  33333  33333
    -----  -----  11111  22222  22222  22222
    -----  -----  -----  -----  -----  -----
  `,
});

export default story;
export const PROGRESSION_HIGH_DAMPING = story.progression;

export const ENERGY_FIELD_STRIP_HIGH_DAMPING = {
  testId: 'strip-high-damping',
  pageId: '02-energy-field/03-high-damping',
  snapshots: story.progression.snapshots,
};
