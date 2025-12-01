import { defineStory } from '../../../test-utils';
import { GRID_WIDTH, createMatrix } from '../shared';

const story = defineStory({
  id: 'shoaling/wave-transformation',
  title: 'Wave Transformation',
  prose: 'Wave height increases as depth decreases.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    // Initial wave pulse at horizon (row 0-1) with moderate height
    for (let col = 0; col < GRID_WIDTH; col++) {
      matrix[0][col] = 0.4; // Moderate amplitude in deep water
      matrix[1][col] = 0.2;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    const shoalingRate = 1.5;

    for (let row = rows - 1; row > 0; row--) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const srcIdx = (row - 1) * cols + col;
        const srcEnergy = data[srcIdx];

        const depthFactor = 1 + (row / rows) * 0.5;
        data[idx] = Math.min(1.0, srcEnergy * (1 + shoalingRate * dt * depthFactor));
      }
    }

    for (let col = 0; col < cols; col++) {
      data[col] *= 0.5;
    }
  },
  expectedAscii: `
    t=0s      t=1s      t=2s      t=3s      t=4s      t=5s
    44444444  --------  --------  --------  --------  --------
    22222222  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
    --------  --------  --------  --------  --------  --------
  `,
});

export default story;
export const PROGRESSION_WAVE_SHOALING = story.progression;

export const SHOALING_STRIP_HEIGHT = {
  testId: 'strip-shoaling-height',
  pageId: '03-shoaling/01-wave-transformation',
  snapshots: story.progression.snapshots,
};
