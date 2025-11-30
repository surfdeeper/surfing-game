import { defineStory, createFilledMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/flat-deep',
  title: 'Flat Bottom (Deep)',
  prose: 'Constant deep water (100%) - waves travel unaffected by bottom.',
  initialMatrix: createFilledMatrix(1.0),
  captureTimes: [0],
  expectedAscii: `
    t=0s
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
    FFFFFFFF
  `,
});

export default story;
export const PROGRESSION_FLAT_DEEP = story.progression;
