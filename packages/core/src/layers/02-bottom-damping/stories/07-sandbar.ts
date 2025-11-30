import { defineStory } from '../../../test-utils';
import { PROGRESSION_SANDBAR as DEPTH_SANDBAR } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_SANDBAR.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/sandbar',
  title: 'Sandbar Damping',
  prose: 'High damping at sandbar creates secondary wave breaking zone.',
  initialMatrix: dampingMatrix,
  captureTimes: [0],
  expectedAscii: `
    t=0s
    11111111
    11111111
    11111111
    BBBBBBBB
    FFFFFFFF
    EEEEEEEE
    DDDDDDDD
    EEEEEEEE
    FFFFFFFF
    FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_SANDBAR = story.progression;

export const DAMPING_STRIP_SANDBAR = {
  testId: 'strip-bottom-damping-sandbar',
  pageId: '02-bottom-damping/07-sandbar',
  snapshots: story.progression.snapshots,
};
