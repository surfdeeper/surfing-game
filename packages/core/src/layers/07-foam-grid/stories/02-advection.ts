import { defineStory } from '../../../test-utils';
import { createMatrix } from '../shared';

const story = defineStory({
  id: 'foam-grid/advection',
  title: 'Advection',
  prose: 'Foam drifts shoreward via advection.',
  initialMatrix: (() => {
    const matrix = createMatrix();
    for (let x = 3; x <= 6; x++) {
      matrix[2][x] = 0.8;
      matrix[3][x] = 0.4;
    }
    return matrix;
  })(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;
    const advectRate = 0.4;
    const advectFactor = Math.min(1, advectRate * dt);

    for (let y = rows - 2; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const downIdx = (y + 1) * cols + x;
        const portion = data[idx] * advectFactor;
        data[idx] -= portion;
        data[downIdx] = Math.min(1, data[downIdx] + portion);
      }
    }

    const decayRate = 0.15;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  expectedAscii: `
    t=0s        t=1s        t=2s        t=3s        t=4s        t=5s
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ---DDDD---  ---AAAA---  ---3333---  ---2222---  ---1111---  ---1111---
    ---4444---  ---4444---  ---4444---  ---3333---  ---2222---  ---1111---
    ----------  ---1111---  ---2222---  ---2222---  ---2222---  ---2222---
    ----------  ----------  ---1111---  ---1111---  ---1111---  ---1111---
    ----------  ----------  ----------  ----------  ---1111---  ---1111---
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
  `,
});

export default story;
export const PROGRESSION_ADVECTION = story.progression;

export const FOAM_GRID_STRIP_ADVECTION = {
  testId: 'strip-foam-grid-advection',
  pageId: '06-foam-grid/02-advection',
  snapshots: story.progression.snapshots,
};
