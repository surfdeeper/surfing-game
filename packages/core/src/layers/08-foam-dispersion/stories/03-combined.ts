import { defineStory } from '../../../test-utils';
import { createMatrix } from '../shared';

const story = defineStory({
  id: 'foam-dispersion/combined',
  title: 'Decay + Spread',
  prose: 'Foam decays while spreading outward.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let row = 4; row <= 5; row++) {
      for (let col = 4; col <= 5; col++) {
        matrix[row][col] = 1.0;
      }
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const diffusionRate = 0.25;
    const decayRate = 0.3;
    const prev = new Float32Array(data);

    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const idx = row * cols + col;
        const laplacian =
          prev[idx - cols] + prev[idx + cols] + prev[idx - 1] + prev[idx + 1] - 4 * prev[idx];
        data[idx] = prev[idx] + diffusionRate * laplacian * dt;
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.max(0, data[i] * Math.exp(-decayRate * dt));
    }
  },
  expectedAscii: `
    t=0s        t=1s        t=2s        t=3s        t=4s        t=5s
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----11----  ----11----  ----11----  ----11----  ----------
    ----FF----  ---1AA1---  ---1331---  ---1111---  ---1111---  ----11----
    ----FF----  ---1AA1---  ---1331---  ---1111---  ---1111---  ----11----
    ----------  ----11----  ----11----  ----11----  ----11----  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
  `,
});

export default story;
export const PROGRESSION_DECAY_AND_SPREAD = story.progression;

export const FOAM_DISPERSION_STRIP_COMBINED = {
  testId: 'strip-foam-combined',
  pageId: '07-foam-dispersion/03-combined',
  snapshots: story.progression.snapshots,
};
