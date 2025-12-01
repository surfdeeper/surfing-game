/**
 * With Energy Drain (Breaking Simulation)
 */
import { updateEnergyField, drainEnergyAt } from '../model';
import { captureWithEvents, asciiToMatrix } from '../../../test-utils';
import { TRAVEL_DURATION, deepWater, SMALL_HEIGHT } from '../shared';

// TODO: Add energy pulse layer and import from there instead of inline
const INITIAL_MATRIX = asciiToMatrix(`
FFFFF
-----
-----
-----
-----
-----`);

/**
 * With energy drain (breaking simulation)
 * Drain at t=1s when energy is still concentrated, creating a visible gap
 */
export const PROGRESSION_WITH_DRAIN = (() => {
  const snapshots = captureWithEvents({
    initialMatrix: INITIAL_MATRIX,
    captureTimes: [0, 1, 2, 3, 4, 5],
    updateFn: (field, dt) => {
      updateEnergyField(field, deepWater, dt, TRAVEL_DURATION, {
        depthDampingCoefficient: 0,
        depthDampingExponent: 1,
      });
    },
    events: [
      {
        time: 1,
        label: 'drain',
        action: (field: any) => {
          // Drain center column at multiple Y positions to create vertical stripe
          for (let y = 0; y < SMALL_HEIGHT; y++) {
            const normalizedY = y / (SMALL_HEIGHT - 1);
            drainEnergyAt(field, 0.5, normalizedY, 10.0);
          }
        },
      },
    ],
  });

  return {
    id: 'energy-field/with-drain',
    description: 'Energy drain at t=1s (breaking simulation) - creates gap in center column',
    initialMatrix: INITIAL_MATRIX,
    captureTimes: [0, 1, 2, 3, 4, 5],
    snapshots,
    metadata: {
      drainTime: 1,
      drainColumn: 'center',
      depthDampingCoefficient: 0,
      travelDuration: TRAVEL_DURATION,
      label: 'With Drain',
    },
    at(time: number) {
      return snapshots.find((s) => s.time === time);
    },
    matrixAt(time: number) {
      const snapshot = this.at(time);
      return snapshot?.matrix ?? null;
    },
  };
})();

export const ENERGY_FIELD_STRIP_WITH_DRAIN = {
  testId: 'strip-with-drain',
  pageId: '02-energy-field/04-with-drain',
  snapshots: PROGRESSION_WITH_DRAIN.snapshots,
};
