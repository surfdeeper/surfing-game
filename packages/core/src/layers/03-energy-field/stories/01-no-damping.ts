import { defineStory } from '../../../test-utils';
import { updateDeepWaterTranslation, INITIAL_PULSE, TRAVEL_DURATION } from '../shared';

const story = defineStory({
  id: 'energy-field/no-damping',
  title: 'No Damping',
  prose: 'Deep water - energy translates as a sharp horizontal line without spreading.',
  initialMatrix: INITIAL_PULSE,
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    updateDeepWaterTranslation(field, dt, TRAVEL_DURATION);
  },
  expectedAscii: `
    t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
    FFFFF  -----  -----  -----  -----  -----
    -----  FFFFF  -----  -----  -----  -----
    -----  -----  FFFFF  -----  -----  -----
    -----  -----  -----  FFFFF  -----  -----
    -----  -----  -----  -----  FFFFF  -----
    -----  -----  -----  -----  -----  FFFFF
  `,
});

export default story;
export const PROGRESSION_NO_DAMPING = story.progression;

export const ENERGY_FIELD_STRIP_NO_DAMPING = {
  testId: 'strip-no-damping',
  pageId: '02-energy-field/01-no-damping',
  snapshots: story.progression.snapshots,
};
