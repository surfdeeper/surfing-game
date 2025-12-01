import { defineStory } from '../../../test-utils';
import { PROGRESSION_SANDBAR as DEPTH_PROGRESSION } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const story = defineStory({
  id: 'bottom-damping/sandbar',
  title: 'Sandbar Damping',
  prose: 'High damping at sandbar creates secondary wave breaking zone.',
  initialMatrix: depthMatrixToDamping(DEPTH_PROGRESSION.snapshots[0].matrix),
  assertInitialAscii: `
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
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    BBBBBBBB  BBBBBBBB  BBBBBBBB  BBBBBBBB  BBBBBBBB  BBBBBBBB
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    DDDDDDDD  DDDDDDDD  DDDDDDDD  DDDDDDDD  DDDDDDDD  DDDDDDDD
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_SANDBAR = story.progression;

export const DAMPING_STRIP_SANDBAR = {
  testId: 'strip-bottom-damping-sandbar',
  pageId: '02-bottom-damping/07-sandbar',
  snapshots: story.progression.snapshots,
};
