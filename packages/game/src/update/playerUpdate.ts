/**
 * Player Update - Handles player proxy updates including AI
 *
 * This module is in the game package because it depends on aiPlayerModel.
 */

import {
  updatePlayerProxy,
  createPlayerProxy,
  PLAYER_PROXY_CONFIG,
} from '@surf/core/src/state/playerProxyModel.js';
import { updateAIPlayer, createAIState } from '../state/aiPlayerModel.js';
import { getOceanBounds, calculateTravelDuration } from '@surf/core/src/render/coordinates.js';

/**
 * Update player proxy
 */
export function updatePlayer(playerProxy, aiState, aiMode, input, state) {
  const { canvasWidth, canvasHeight, shoreHeight, swellSpeed, foamGrid } = state;
  const { oceanTop, oceanBottom, shoreY } = getOceanBounds(canvasHeight, shoreHeight);
  const travelDuration = calculateTravelDuration(oceanBottom, swellSpeed);
  const scaledDelta = state.deltaTime;

  let currentAiState = aiState;
  let playerInput = input;
  let lastAIInput = { left: false, right: false, up: false, down: false };

  if (state.showAIPlayer) {
    if (!currentAiState) {
      currentAiState = createAIState(aiMode);
    }
    playerInput = updateAIPlayer(
      playerProxy,
      currentAiState,
      state.world,
      scaledDelta,
      canvasWidth,
      canvasHeight,
      oceanTop,
      oceanBottom,
      travelDuration
    );
    lastAIInput = playerInput;
  }

  const updatedPlayer = updatePlayerProxy(
    playerProxy,
    scaledDelta,
    playerInput,
    foamGrid,
    shoreY,
    canvasWidth,
    canvasHeight,
    oceanTop,
    oceanBottom,
    PLAYER_PROXY_CONFIG
  );

  return {
    playerProxy: updatedPlayer,
    aiState: currentAiState,
    lastAIInput,
  };
}

/**
 * Initialize player proxy
 */
export function initializePlayer(canvasWidth, canvasHeight, shoreHeight) {
  const { shoreY } = getOceanBounds(canvasHeight, shoreHeight);
  return createPlayerProxy(canvasWidth, shoreY);
}

// Re-export for convenience
export { createAIState } from '../state/aiPlayerModel.js';
