import { defineStory } from '../../../test-utils';
import { PROGRESSION_SLOPE_GENTLE as DEPTH_SLOPE_GENTLE } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_SLOPE_GENTLE.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/slope-gentle',
  title: 'Gentle Slope Damping',
  prose: 'Gradual damping gradient - low offshore, high nearshore.',
  initialMatrix: dampingMatrix,
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_SLOPE_GENTLE = story.progression;

export const DAMPING_STRIP_SLOPE_GENTLE = {
  testId: 'strip-bottom-damping-slope-gentle',
  pageId: '02-bottom-damping/04-slope-gentle',
  snapshots: story.progression.snapshots,
};
