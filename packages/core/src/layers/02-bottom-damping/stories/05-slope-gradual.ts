import { defineStory } from '../../../test-utils';
import { PROGRESSION_SLOPE_GRADUAL as DEPTH_SLOPE_GRADUAL } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_SLOPE_GRADUAL.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/slope-gradual',
  title: 'Gradual Slope Damping',
  prose: 'Medium damping gradient from deep to shallow.',
  initialMatrix: dampingMatrix,
  captureTimes: [0],
  expectedAscii: `
    t=0s
    AAAAAAAA
    BBBBBBBB
    CCCCCCCC
    DDDDDDDD
    DDDDDDDD
    EEEEEEEE
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_SLOPE_GRADUAL = story.progression;

export const DAMPING_STRIP_SLOPE_GRADUAL = {
  testId: 'strip-bottom-damping-slope-gradual',
  pageId: '02-bottom-damping/05-slope-gradual',
  snapshots: story.progression.snapshots,
};
