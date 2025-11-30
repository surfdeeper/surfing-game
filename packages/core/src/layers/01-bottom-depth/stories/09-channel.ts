import { defineStory, GRID_WIDTH, GRID_HEIGHT, createMatrix } from '../../../test-utils';

const story = defineStory({
  id: 'bathymetry/channel',
  title: 'Channel',
  prose: 'Deep channel between shallow areas (river mouth pattern).',
  initialMatrix: (() => {
    const matrix = createMatrix();
    const channelCol = Math.floor(GRID_WIDTH / 2);

    for (let row = 0; row < GRID_HEIGHT; row++) {
      const baseDepth = 1 - row / (GRID_HEIGHT - 1);

      for (let col = 0; col < GRID_WIDTH; col++) {
        const distFromChannel = Math.abs(col - channelCol);
        const channelEffect = distFromChannel <= 1 ? 0.3 : distFromChannel <= 2 ? -0.2 : 0;
        matrix[row][col] = Math.max(0, Math.min(1, baseDepth + channelEffect));
      }
    }
    return matrix;
  })(),
  captureTimes: [0],
  expectedAscii: `
    t=0s
    FFDFFFDF
    EECFFFCE
    DDBFFFBD
    CCAFFFAC
    BB4EEE4B
    442CCC24
    331BBB13
    22-AAA-2
    11-444-1
    ---333--
  `,
});

export default story;
export const PROGRESSION_CHANNEL = story.progression;
