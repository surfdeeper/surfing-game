/**
 * FPS Tracker - Smooth FPS calculation with "bad FPS hold" behavior
 *
 * Features:
 * - Exponential moving average for smooth display
 * - Holds bad FPS values for 2 seconds so users can see them
 * - Clamps delta time to prevent huge jumps after tab restore
 */

const MAX_DELTA_TIME = 0.1; // 100ms max - prevents huge jumps after tab restore
const BAD_FPS_THRESHOLD = 30;
const BAD_FPS_HOLD_DURATION = 2000; // 2 seconds

/**
 * Create an FPS tracker instance
 * @returns {object} FPS tracker with update() and getDisplayFps() methods
 */
export function createFpsTracker() {
  let lastTime = 0;
  let displayFps = 60;
  let smoothFps = 60;
  let badFpsHoldUntil = 0;

  return {
    /**
     * Update FPS calculation with new frame timestamp
     * @param {number} timestamp - Current frame timestamp from requestAnimationFrame
     * @returns {number} Delta time in seconds (clamped)
     */
    update(timestamp) {
      let deltaTime = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      // Clamp deltaTime to prevent huge jumps when returning from background
      if (deltaTime > MAX_DELTA_TIME) {
        deltaTime = MAX_DELTA_TIME;
      }

      // Calculate instantaneous FPS and smooth it
      const instantFps = deltaTime > 0 ? 1 / deltaTime : 60;
      smoothFps = smoothFps * 0.95 + instantFps * 0.05; // Exponential moving average

      // If FPS drops below threshold, hold that value for a while
      if (smoothFps < BAD_FPS_THRESHOLD) {
        displayFps = smoothFps;
        badFpsHoldUntil = timestamp + BAD_FPS_HOLD_DURATION;
      } else if (timestamp < badFpsHoldUntil) {
        // Keep showing the bad FPS value during hold period
        // (displayFps stays unchanged)
      } else {
        displayFps = smoothFps;
      }

      return deltaTime;
    },

    /**
     * Get current display FPS value
     * @returns {number} FPS value for display
     */
    getDisplayFps() {
      return displayFps;
    },

    /**
     * Reset timing (call when tab becomes visible again)
     */
    resetTiming() {
      lastTime = performance.now();
    },
  };
}
