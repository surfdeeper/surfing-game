/**
 * Flat Medium Damping - Uniform medium damping from medium depth
 *
 * Input: Flat medium depth (0.50 uniform) from Layer 1
 * Output: Uniform medium damping (moderate wave energy loss)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_FLAT_MEDIUM as DEPTH_FLAT_MEDIUM } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_FLAT_MEDIUM.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_FLAT_MEDIUM = defineProgression({
  id: 'bottom-damping/flat-medium',
  description: 'Uniform medium damping from medium depth - moderate wave energy loss',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Flat Medium Damping',
    inputLayer: 'bottom-depth/flat-medium',
    dampingRange: 'medium (uniform)',
  },
});

export const DAMPING_STRIP_FLAT_MEDIUM = createStrip(
  PROGRESSION_FLAT_MEDIUM,
  '02-bottom-damping/02-flat-medium'
);
