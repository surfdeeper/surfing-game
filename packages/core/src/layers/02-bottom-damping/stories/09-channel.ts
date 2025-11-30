import { defineStory } from '../../../test-utils';
import { PROGRESSION_CHANNEL as DEPTH_CHANNEL } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const depthMatrix = DEPTH_CHANNEL.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

const story = defineStory({
  id: 'bottom-damping/channel',
  title: 'Channel Damping',
  prose: 'Low damping in deep channel allows waves to propagate further.',
  initialMatrix: dampingMatrix,
  captureTimes: [0],
  expectedAscii: `
    t=0s
    11111111
    11211121
    11411141
    33B111B3
    44C111C4
    BBE111EB
    DDF333FD
    EEFAAAFE
    FFFBBBFF
    FFFDDDFF
  `,
});

export default story;
export const PROGRESSION_CHANNEL = story.progression;

export const DAMPING_STRIP_CHANNEL = {
  testId: 'strip-bottom-damping-channel',
  pageId: '02-bottom-damping/09-channel',
  snapshots: story.progression.snapshots,
};
