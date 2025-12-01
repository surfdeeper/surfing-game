/**
 * @surf/player - Player input and AI control systems
 *
 * Provides keyboard input handling and AI player logic for the surfing game.
 */

// Keyboard input
export { KeyboardInput, type KeyState } from './keyboard.js';

// AI player model
export {
  AI_STATE,
  AI_MODE,
  MODE_CONFIG,
  createAIState,
  updateAIPlayer,
  cycleAIMode,
  drawAIKeyIndicator,
  type AIStateType,
  type AIModeType,
  type ModeConfig,
  type AIStats,
  type AIState,
  type PlayerPosition,
  type FoamGrid,
  type World,
} from './aiPlayerModel.js';
