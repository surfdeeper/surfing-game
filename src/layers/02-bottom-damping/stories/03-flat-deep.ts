/**
 * Flat Deep Damping - Uniform low damping from deep water
 *
 * Input: Flat deep depth (0.75 uniform) from Layer 1
 * Output: Uniform low damping (waves propagate further)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_FLAT_DEEP as DEPTH_FLAT_DEEP } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_FLAT_DEEP.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_FLAT_DEEP = defineProgression({
  id: 'bottom-damping/flat-deep',
  description: 'Uniform low damping from deep water - waves propagate further',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Flat Deep Damping',
    inputLayer: 'bottom-depth/flat-deep',
    dampingRange: 'low (uniform)',
  },
});

export const DAMPING_STRIP_FLAT_DEEP = createStrip(
  PROGRESSION_FLAT_DEEP,
  '02-bottom-damping/03-flat-deep'
);
