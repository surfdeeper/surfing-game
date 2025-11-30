import { defineStory } from '../../../test-utils';
import { PROGRESSION_FLAT_SHALLOW as DEPTH_FLAT_SHALLOW } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_FLAT_SHALLOW.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/flat-shallow',
  title: 'Flat Shallow Damping',
  prose: 'Uniform high damping from shallow depth - waves lose energy quickly everywhere.',
  initialMatrix: dampingMatrix,
  captureTimes: [0],
  expectedAscii: `
    t=0s
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
});

export default story;
export const PROGRESSION_FLAT_SHALLOW = story.progression;

export const DAMPING_STRIP_FLAT_SHALLOW = {
  testId: 'strip-bottom-damping-flat-shallow',
  pageId: '02-bottom-damping/01-flat-shallow',
  snapshots: story.progression.snapshots,
};
