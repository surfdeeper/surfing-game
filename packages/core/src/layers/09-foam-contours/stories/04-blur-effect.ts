import { FOAM_STRIP_BASIC } from './01-basic-shapes';

export const FOAM_STRIP_NO_BLUR = {
  testId: 'strip-foam-no-blur',
  pageId: '08-foam-contours/04-blur-effect',
  snapshots: FOAM_STRIP_BASIC.snapshots,
  blurPasses: 0,
};

export const FOAM_STRIP_HIGH_BLUR = {
  testId: 'strip-foam-high-blur',
  pageId: '08-foam-contours/04-blur-effect',
  snapshots: FOAM_STRIP_BASIC.snapshots,
  blurPasses: 3,
};
