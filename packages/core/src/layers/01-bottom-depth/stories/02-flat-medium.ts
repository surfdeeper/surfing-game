import { defineStory, createFilledMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/flat-medium',
  title: 'Flat Bottom (Medium)',
  prose: 'Constant medium depth (50%) - moderate wave-bottom interaction.',
  initialMatrix: createFilledMatrix(0.5),
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
