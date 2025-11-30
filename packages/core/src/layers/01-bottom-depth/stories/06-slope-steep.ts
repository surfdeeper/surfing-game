import { defineStory, GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/slope-steep',
  title: 'Linear Slope (Steep)',
  prose: 'Steep gradient from deep (100%) at horizon to shore - maximum depth change.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const maxDepth = 1.0;
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
    FFFFFFFF
    EEEEEEEE
    DDDDDDDD
    CCCCCCCC
    BBBBBBBB
    44444444
    33333333
    22222222
    11111111
    --------
  `,
});

export default story;
export const PROGRESSION_SLOPE_STEEP = story.progression;
