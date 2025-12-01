/**
 * Debug Panel Manager - Handles React UI lifecycle
 *
 * Creates the UI container and provides a render function
 * that can be called each frame with updated props.
 */

import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';
import { DebugPanel, DebugPanelProps } from './DebugPanel.js';
import { getWaveProgress } from '@surf/core/src/state/waveModel.js';

export interface Wave {
  id: string;
  type: string;
  amplitude: number;
  spawnTime: number;
}

export interface DebugPanelManager {
  render: (props: DebugPanelProps) => void;
  prepareDisplayWaves: (
    waves: Wave[],
    gameTime: number,
    travelDuration: number
  ) => Array<{
    wave: Wave;
    progress: number;
    travelDuration: number;
  }>;
}

/**
 * Create debug panel manager
 * @param containerId - ID of the container element (defaults to 'ui-root')
 * @returns Manager with render() method
 */
export function createDebugPanelManager(containerId = 'ui-root'): DebugPanelManager {
  // Find or create UI container
  let uiContainer = document.getElementById(containerId);
  if (!uiContainer) {
    uiContainer = document.createElement('div');
    uiContainer.id = containerId;
    document.body.appendChild(uiContainer);
  }

  const reactRoot: Root = createRoot(uiContainer);

  return {
    /**
     * Render the debug panel with current state
     * @param props - Props to pass to DebugPanel
     */
    render(props: DebugPanelProps) {
      reactRoot.render(createElement(DebugPanel, props));
    },

    /**
     * Prepare display wave data for debug panel
     * @param waves - Array of wave objects
     * @param gameTime - Current game time
     * @param travelDuration - Wave travel duration
     * @returns Sorted, filtered display wave data
     */
    prepareDisplayWaves(waves: Wave[], gameTime: number, travelDuration: number) {
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
