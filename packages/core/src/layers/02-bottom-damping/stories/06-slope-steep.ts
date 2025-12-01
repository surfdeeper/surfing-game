import { defineStory } from '../../../test-utils';
import { PROGRESSION_SLOPE_STEEP as DEPTH_PROGRESSION } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const story = defineStory({
  id: 'bottom-damping/slope-steep',
  title: 'Steep Slope Damping',
  prose: 'Maximum damping gradient from deep to shallow.',
  initialMatrix: depthMatrixToDamping(DEPTH_PROGRESSION.snapshots[0].matrix),
  assertInitialAscii: `
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
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    33333333  33333333  33333333  33333333  33333333  33333333
    44444444  44444444  44444444  44444444  44444444  44444444
    BBBBBBBB  BBBBBBBB  BBBBBBBB  BBBBBBBB  BBBBBBBB  BBBBBBBB
    DDDDDDDD  DDDDDDDD  DDDDDDDD  DDDDDDDD  DDDDDDDD  DDDDDDDD
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_SLOPE_STEEP = story.progression;

export const DAMPING_STRIP_SLOPE_STEEP = {
  testId: 'strip-bottom-damping-slope-steep',
  pageId: '02-bottom-damping/06-slope-steep',
  snapshots: story.progression.snapshots,
};
