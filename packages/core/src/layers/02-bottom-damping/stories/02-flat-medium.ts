import { defineStory } from '../../../test-utils';
import { PROGRESSION_FLAT_MEDIUM as DEPTH_PROGRESSION } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../model.js';

const story = defineStory({
  id: 'bottom-damping/flat-medium',
  title: 'Flat Medium Damping',
  prose: 'Uniform medium damping from medium depth - moderate wave energy loss.',
  initialMatrix: depthMatrixToDamping(DEPTH_PROGRESSION.snapshots[0].matrix),
  assertInitialAscii: `
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
    AAAAAAAA
  `,
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
    AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA  AAAAAAAA
  `,
});

export default story;
export const PROGRESSION_FLAT_MEDIUM = story.progression;

export const DAMPING_STRIP_FLAT_MEDIUM = {
  testId: 'strip-bottom-damping-flat-medium',
  pageId: '02-bottom-damping/02-flat-medium',
  snapshots: story.progression.snapshots,
};
