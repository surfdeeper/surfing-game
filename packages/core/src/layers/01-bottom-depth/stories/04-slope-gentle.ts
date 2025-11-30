import { defineStory, GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/slope-gentle',
  title: 'Linear Slope (Gentle)',
  prose: 'Gentle gradient from shallow (25%) at horizon to shore - minimal depth change.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const maxDepth = 0.25;
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const depth = maxDepth * (1 - row / (GRID_HEIGHT - 1));
      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = depth;
      }
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    33333333  33333333  33333333  33333333  33333333  33333333
    22222222  22222222  22222222  22222222  22222222  22222222
    22222222  22222222  22222222  22222222  22222222  22222222
    22222222  22222222  22222222  22222222  22222222  22222222
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    11111111  11111111  11111111  11111111  11111111  11111111
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
  `,
});

export default story;
export const PROGRESSION_SLOPE_GENTLE = story.progression;
