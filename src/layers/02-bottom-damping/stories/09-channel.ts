/**
 * Channel Damping - Low damping corridor through high damping zone
 *
 * Input: Channel depth (deeper center channel) from Layer 1
 * Output: Low damping corridor (energy corridor through shallow zone)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_CHANNEL as DEPTH_CHANNEL } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_CHANNEL.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_CHANNEL = defineProgression({
  id: 'bottom-damping/channel',
  description: 'Low damping corridor - energy passes through deep channel',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Channel Damping',
    inputLayer: 'bottom-depth/channel',
    dampingRange: 'corridor (low in center)',
  },
});

export const DAMPING_STRIP_CHANNEL = createStrip(
  PROGRESSION_CHANNEL,
  '02-bottom-damping/09-channel'
);
