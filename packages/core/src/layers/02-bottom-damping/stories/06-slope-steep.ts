import { defineStory } from '../../../test-utils';
import { PROGRESSION_SLOPE_STEEP as DEPTH_SLOPE_STEEP } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_SLOPE_STEEP.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/slope-steep',
  title: 'Steep Slope Damping',
  prose: 'Maximum damping gradient from deep to shallow.',
  initialMatrix: dampingMatrix,
  captureTimes: [0],
  expectedAscii: `
    t=0s
    11111111
    11111111
    11111111
    33333333
    44444444
    BBBBBBBB
    DDDDDDDD
    EEEEEEEE
    FFFFFFFF
    FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_SLOPE_STEEP = story.progression;

export const DAMPING_STRIP_SLOPE_STEEP = {
  testId: 'strip-bottom-damping-slope-steep',
  pageId: '02-bottom-damping/06-slope-steep',
  snapshots: story.progression.snapshots,
};
