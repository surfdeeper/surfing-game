import { defineStory } from '../../../test-utils';
import { PROGRESSION_REEF as DEPTH_REEF } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_REEF.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/reef',
  title: 'Reef Damping',
  prose: 'Circular high-damping zone at reef creates localized wave breaking.',
  initialMatrix: dampingMatrix,
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    33333333  33333333  33333333  33333333  33333333  33333333
    444BDB44  444BDB44  444BDB44  444BDB44  444BDB44  444BDB44
    BBBFFFBB  BBBFFFBB  BBBFFFBB  BBBFFFBB  BBBFFFBB  BBBFFFBB
    DDDFFFDD  DDDFFFDD  DDDFFFDD  DDDFFFDD  DDDFFFDD  DDDFFFDD
    EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE  EEEEEEEE
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
    FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF  FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_REEF = story.progression;

export const DAMPING_STRIP_REEF = {
  testId: 'strip-bottom-damping-reef',
  pageId: '02-bottom-damping/08-reef',
  snapshots: story.progression.snapshots,
};
