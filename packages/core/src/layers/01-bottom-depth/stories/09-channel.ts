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
  captureTimes: [0, 1, 2, 3, 4, 5],
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    FFDFFFDF  FFDFFFDF  FFDFFFDF  FFDFFFDF  FFDFFFDF  FFDFFFDF
    EECFFFCE  EECFFFCE  EECFFFCE  EECFFFCE  EECFFFCE  EECFFFCE
    DDBFFFBD  DDBFFFBD  DDBFFFBD  DDBFFFBD  DDBFFFBD  DDBFFFBD
    CCAFFFAC  CCAFFFAC  CCAFFFAC  CCAFFFAC  CCAFFFAC  CCAFFFAC
    BB4EEE4B  BB4EEE4B  BB4EEE4B  BB4EEE4B  BB4EEE4B  BB4EEE4B
    442CCC24  442CCC24  442CCC24  442CCC24  442CCC24  442CCC24
    331BBB13  331BBB13  331BBB13  331BBB13  331BBB13  331BBB13
    22-AAA-2  22-AAA-2  22-AAA-2  22-AAA-2  22-AAA-2  22-AAA-2
    11-444-1  11-444-1  11-444-1  11-444-1  11-444-1  11-444-1
    ---333--  ---333--  ---333--  ---333--  ---333--  ---333--
  `,
});

export default story;
export const PROGRESSION_CHANNEL = story.progression;
