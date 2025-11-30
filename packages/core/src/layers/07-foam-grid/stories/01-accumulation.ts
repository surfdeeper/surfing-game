import { defineStory } from '../../../test-utils';
import { createMatrix } from '../shared';

const story = defineStory({
  id: 'foam-grid/accumulation',
  title: 'Accumulation',
  prose: 'Foam density accumulates from repeated energy deposits.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    matrix[4][5] = 0.2;
    matrix[4][4] = 0.1;
    matrix[4][6] = 0.1;
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const cols = field.width;
    const data = field.height;
    const depositY = 4;
    const depositAmount = 0.15 * dt;

    for (let x = 3; x <= 6; x++) {
      const idx = depositY * cols + x;
      const amount = depositAmount * (0.8 + Math.random() * 0.4);
      data[idx] = Math.min(1.0, data[idx] + amount);
    }

    const decayRate = 0.05;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  expectedAscii: `
    t=0s        t=1s        t=2s        t=3s        t=4s        t=5s
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----121---  ---1232---  ---34A4---  ---4ABA---  ---ABCB---  ---CCDC---
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
  `,
});

export default story;
export const PROGRESSION_ACCUMULATION = story.progression;

export const FOAM_GRID_STRIP_ACCUMULATION = {
  testId: 'strip-foam-grid-accumulation',
  pageId: '06-foam-grid/01-accumulation',
  snapshots: story.progression.snapshots,
};
