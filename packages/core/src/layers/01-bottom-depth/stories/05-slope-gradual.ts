import { defineStory, GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/slope-gradual',
  title: 'Linear Slope (Gradual)',
  prose: 'Gradual gradient from medium depth (50%) at horizon to shore.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const maxDepth = 0.5;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = maxDepth * (1 - row / (GRID_HEIGHT - 1));
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  expectedAscii: `
    t=0s
    AAAAAAAA
    44444444
    44444444
    33333333
    33333333
    22222222
    22222222
    11111111
    11111111
    --------
  `,
});

export default story;
export const PROGRESSION_SLOPE_GRADUAL = story.progression;
