import { defineStory } from '../../../test-utils';
import { PROGRESSION_FLAT_DEEP as DEPTH_FLAT_DEEP } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_FLAT_DEEP.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/flat-deep',
  title: 'Flat Deep Damping',
  prose: 'Uniform low damping from deep water - waves propagate further.',
  initialMatrix: dampingMatrix,
  captureTimes: [0],
  expectedAscii: `
    t=0s
    11111111
    11111111
    11111111
    11111111
    11111111
    11111111
    11111111
    11111111
    11111111
    11111111
  `,
});

export default story;
export const PROGRESSION_FLAT_DEEP = story.progression;

export const DAMPING_STRIP_FLAT_DEEP = {
  testId: 'strip-bottom-damping-flat-deep',
  pageId: '02-bottom-damping/03-flat-deep',
  snapshots: story.progression.snapshots,
};
