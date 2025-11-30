/**
 * Reef Damping - Abrupt damping transition
 *
 * Input: Reef depth (abrupt shelf) from Layer 1
 * Output: Sharp damping transition (sudden energy loss at reef edge)
 */
import { defineProgression } from '../../../test-utils';
import { PROGRESSION_REEF as DEPTH_REEF } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

const STATIC_CAPTURE = [0];

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_REEF.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_REEF = defineProgression({
  id: 'bottom-damping/reef',
  description: 'Sharp damping transition - sudden energy loss at reef edge',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: {
    label: 'Reef Damping',
    inputLayer: 'bottom-depth/reef',
    dampingRange: 'abrupt transition',
  },
});

export const DAMPING_STRIP_REEF = {
  testId: 'strip-damping-reef',
  pageId: '02-bottom-damping/08-reef',
  snapshots: PROGRESSION_REEF.snapshots,
};
