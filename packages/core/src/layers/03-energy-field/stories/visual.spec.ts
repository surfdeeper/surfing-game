import { defineStripVisualTests } from '../../../../../../packages/visual-regression-testing-viewer-react-application/src/visual-test-helpers';
import { ENERGY_FIELD_STRIP_NO_DAMPING } from './01-no-damping';
import { ENERGY_FIELD_STRIP_LOW_DAMPING } from './02-low-damping';
import { ENERGY_FIELD_STRIP_HIGH_DAMPING } from './03-high-damping';
import { ENERGY_FIELD_STRIP_WITH_DRAIN } from './04-with-drain';

defineStripVisualTests([
  ENERGY_FIELD_STRIP_NO_DAMPING,
  ENERGY_FIELD_STRIP_LOW_DAMPING,
  ENERGY_FIELD_STRIP_HIGH_DAMPING,
  ENERGY_FIELD_STRIP_WITH_DRAIN,
]);
