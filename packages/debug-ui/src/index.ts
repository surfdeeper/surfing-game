/**
 * @surf/debug-ui - Debug panel React components
 *
 * Provides a reusable debug UI panel for the surfing game simulation.
 */

// Main component and types
export {
  DebugPanel,
  type DebugPanelProps,
  type SetLullState,
  type DisplayWave,
  type Toggles,
  type PlayerConfig,
  type CameraConfig,
} from './DebugPanel.js';

// Manager for React lifecycle
export { createDebugPanelManager, type DebugPanelManager, type Wave } from './debugPanelManager.js';

// Re-export CSS path for manual import if needed
// Usage: import '@surf/debug-ui/src/DebugPanel.css';
