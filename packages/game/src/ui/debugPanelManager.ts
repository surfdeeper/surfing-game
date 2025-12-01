/**
 * Debug Panel Manager - Handles React UI lifecycle
 *
 * Creates the UI container and provides a render function
 * that can be called each frame with updated props.
 */

import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { DebugPanel } from './DebugPanel.jsx';
import { getWaveProgress } from '@surf/core/src/state/waveModel.js';

/**
 * Create debug panel manager
 * @returns {object} Manager with render() method
 */
export function createDebugPanelManager() {
  // Create UI container
  const uiContainer = document.createElement('div');
  uiContainer.id = 'ui-root';
  document.body.appendChild(uiContainer);
  const reactRoot = createRoot(uiContainer);

  return {
    /**
     * Render the debug panel with current state
     * @param {object} props - Props to pass to DebugPanel
     */
    render(props) {
      reactRoot.render(createElement(DebugPanel, props));
    },

    /**
     * Prepare display wave data for debug panel
     * @param {Array} waves - Array of wave objects
     * @param {number} gameTime - Current game time
     * @param {number} travelDuration - Wave travel duration
     * @returns {Array} Sorted, filtered display wave data
     */
    prepareDisplayWaves(waves, gameTime, travelDuration) {
      return waves
        .map((wave) => ({
          wave,
          progress: getWaveProgress(wave, gameTime, travelDuration),
          travelDuration,
        }))
        .filter(({ progress }) => progress < 1)
        .sort((a, b) => a.progress - b.progress);
    },
  };
}
