import { defineStory, GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/reef',
  title: 'Reef',
  prose: 'Localized reef creates circular shallow zone.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const reefRow = Math.floor(GRID_HEIGHT * 0.5);
    const reefCol = Math.floor(GRID_WIDTH * 0.5);
    const reefRadius = 2;

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);

      for (let col = 0; col < GRID_WIDTH; col++) {
        const dist = Math.sqrt((row - reefRow) ** 2 + (col - reefCol) ** 2);
        const reefEffect = dist < reefRadius ? 0.5 * (1 - dist / reefRadius) : 0;
        matrix[row][col] = Math.max(0, baseDepth - reefEffect);
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
    BBB434BB
    4442-244
    33321233
    22222222
    11111111
    --------
  `,
});

export default story;
export const PROGRESSION_REEF = story.progression;
