import { defineStory } from '../../../test-utils';
import { createMatrix } from '../shared';

const story = defineStory({
  id: 'foam-grid/combined',
  title: 'Combined',
  prose: 'Foam accumulates at breaking zone and drifts shoreward.',
  initialMatrix: createMatrix(),
  captureTimes: [0, 1, 2, 3, 4, 5],
  updateFn: (field, dt) => {
    const rows = field.gridHeight;
    const cols = field.width;
    const data = field.height;

    const depositY = 3;
    const depositAmount = 0.25 * dt;
    for (let x = 2; x <= 7; x++) {
      const idx = depositY * cols + x;
      const amount = depositAmount * (0.7 + Math.random() * 0.6);
      data[idx] = Math.min(1.0, data[idx] + amount);
    }

    const advectRate = 0.3;
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

    const decayRate = 0.2;
    for (let i = 0; i < data.length; i++) {
      data[i] *= Math.exp(-decayRate * dt);
    }
  },
  expectedAscii: `
    t=0s        t=1s        t=2s        t=3s        t=4s        t=5s
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  --234443--  --234443--  --234443--  --234443--  --234443--
    ----------  --122221--  --344443--  --455554--  --455554--  --455554--
    ----------  ----------  --122221--  --233332--  --344443--  --344443--
    ----------  ----------  ----------  --111111--  --122221--  --233332--
    ----------  ----------  ----------  ----------  --111111--  --111111--
    ----------  ----------  ----------  ----------  ----------  ----------
    ----------  ----------  ----------  ----------  ----------  ----------
  `,
});

export default story;
export const PROGRESSION_COMBINED = story.progression;

export const FOAM_GRID_STRIP_COMBINED = {
  testId: 'strip-foam-grid-combined',
  pageId: '06-foam-grid/03-combined',
  snapshots: story.progression.snapshots,
};
