import { defineStory, createFilledMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/flat-shallow',
  title: 'Flat Bottom (Shallow)',
  prose: 'Constant shallow depth (25%) across the entire grid.',
  initialMatrix: createFilledMatrix(0.25),
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
    33333333  33333333  33333333  33333333  33333333  33333333
  `,
});

export default story;
export const PROGRESSION_FLAT_SHALLOW = story.progression;
