import { defineStory } from '../../../test-utils';
import { PROGRESSION_FLAT_SHALLOW as DEPTH_PROGRESSION } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const story = defineStory({
  id: 'bottom-damping/flat-shallow',
  title: 'Flat Shallow Damping',
  prose: 'Uniform high damping from shallow depth - waves lose energy quickly everywhere.',
  initialMatrix: depthMatrixToDamping(DEPTH_PROGRESSION.snapshots[0].matrix),
  assertInitialAscii: `
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
    EEEEEEEE
  `,
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
  `,
});

export default story;
export const PROGRESSION_FLAT_SHALLOW = story.progression;

export const DAMPING_STRIP_FLAT_SHALLOW = {
  testId: 'strip-bottom-damping-flat-shallow',
  pageId: '02-bottom-damping/01-flat-shallow',
  snapshots: story.progression.snapshots,
};
