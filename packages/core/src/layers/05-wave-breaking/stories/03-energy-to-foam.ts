import { defineStory } from '../../../test-utils';
import { GRID_WIDTH, createMatrix } from '../shared';

const story = defineStory({
  id: 'wave-breaking/energy-to-foam',
  title: 'Energy to Foam',
  prose: 'Breaking drains wave energy and deposits as foam.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 1.0;
      matrix[1][col] = 0.8;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, _dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const breakingRow = Math.floor(rows * 0.5);

    for (let row = rows - 1; row > 0; row--) {
      const isBreakingZone = row >= breakingRow && row < breakingRow + 2;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;
        let value = data[srcIdx];

        if (isBreakingZone && value > 0.3) {
          const drained = value * 0.4;
          value -= drained;
          if (row + 1 < rows) {
            data[(row + 1) * cols + col] += drained * 0.3;
          }
        }

        data[idx] = Math.min(1.0, value);
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.7;
    }
  },
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    FFFFFFFF  --------  --------  --------  --------  --------
    DDDDDDDD  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
  `,
});

export default story;
export const PROGRESSION_ENERGY_TO_FOAM = story.progression;

export const WAVE_BREAKING_STRIP_ENERGY = {
  testId: 'strip-breaking-energy',
  pageId: '04-wave-breaking/03-energy-to-foam',
  snapshots: story.progression.snapshots,
};
