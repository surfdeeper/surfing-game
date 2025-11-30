import { defineStory, GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/sandbar',
  title: 'Sandbar',
  prose: 'Shallow sandbar in mid-water creates secondary breaking zone.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const barRow = Math.floor(GRID_HEIGHT * 0.4);
    const barWidth = 2;

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);
      const distFromBar = Math.abs(row - barRow);
      const barEffect = distFromBar < barWidth ? 0.4 * (1 - distFromBar / barWidth) : 0;

      for (let col = 0; col < GRID_WIDTH; col++) {
        matrix[row][col] = Math.max(0, baseDepth - barEffect);
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
    AAAAAAAA
    22222222
    22222222
    33333333
    22222222
    11111111
    --------
  `,
});

export default story;
export const PROGRESSION_SANDBAR = story.progression;
