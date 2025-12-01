import { defineStripVisualTests } from '../../../../../../packages/visual-regression-testing-viewer-react-application/src/visual-test-helpers';
import { DAMPING_STRIP_FLAT_SHALLOW } from './01-flat-shallow';
import { DAMPING_STRIP_FLAT_MEDIUM } from './02-flat-medium';
import { DAMPING_STRIP_FLAT_DEEP } from './03-flat-deep';
import { DAMPING_STRIP_SLOPE_GENTLE } from './04-slope-gentle';
import { DAMPING_STRIP_SLOPE_GRADUAL } from './05-slope-gradual';
import { DAMPING_STRIP_SLOPE_STEEP } from './06-slope-steep';
import { DAMPING_STRIP_SANDBAR } from './07-sandbar';
import { DAMPING_STRIP_REEF } from './08-reef';
import { DAMPING_STRIP_CHANNEL } from './09-channel';

defineStripVisualTests([
  DAMPING_STRIP_FLAT_SHALLOW,
  DAMPING_STRIP_FLAT_MEDIUM,
  DAMPING_STRIP_FLAT_DEEP,
  DAMPING_STRIP_SLOPE_GENTLE,
  DAMPING_STRIP_SLOPE_GRADUAL,
  DAMPING_STRIP_SLOPE_STEEP,
  DAMPING_STRIP_SANDBAR,
  DAMPING_STRIP_REEF,
  DAMPING_STRIP_CHANNEL,
]);
