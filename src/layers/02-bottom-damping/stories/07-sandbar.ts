/**
 * Sandbar Damping - High damping zone in mid-water
 *
 * Input: Sandbar depth (shallow feature in mid-water) from Layer 1
 * Output: Localized high damping zone (secondary breaking/energy loss area)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_SANDBAR as DEPTH_SANDBAR } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_SANDBAR.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_SANDBAR = defineProgression({
  id: 'bottom-damping/sandbar',
  description: 'Localized high damping zone - secondary breaking area over sandbar',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Sandbar Damping',
    inputLayer: 'bottom-depth/sandbar',
    dampingRange: 'localized high (sandbar feature)',
  },
});

export const DAMPING_STRIP_SANDBAR = createStrip(
  PROGRESSION_SANDBAR,
  '02-bottom-damping/07-sandbar'
);
