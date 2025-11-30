// AI Player Integration Test
// Tests AI behavior using the same setup as the real game

import { describe, it, expect } from 'vitest';
import { createAIState, updateAIPlayer, AI_MODE, AI_STATE } from './aiPlayerModel.js';
// Note: AI_STATE.SEEKING replaces PADDLE_OUT, AI starts by actively looking for foam
import { createPlayerProxy, updatePlayerProxy } from './playerProxyModel.js';
import { DEFAULT_BATHYMETRY } from './bathymetryModel.js';
import { getOceanBounds, calculateTravelDuration } from '../coordinates.js';
import { createFoamGrids } from './foamGridModel.js';

// Simulate real game dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 700;
const SHORE_HEIGHT = 100;

// Get bounds exactly like the real game does
const { oceanTop, oceanBottom, shoreY } = getOceanBounds(CANVAS_HEIGHT, SHORE_HEIGHT);
const TRAVEL_DURATION = calculateTravelDuration(oceanBottom, 50); // 50 px/s wave speed

function createFoamGridBand(yNorm, startXNorm, endXNorm, intensity = 0.5) {
  const { foam } = createFoamGrids();
  const row = Math.min(foam.height - 1, Math.max(0, Math.floor(yNorm * (foam.height - 1))));
  const start = Math.min(foam.width - 1, Math.max(0, Math.floor(startXNorm * (foam.width - 1))));
  const end = Math.min(foam.width - 1, Math.max(start, Math.floor(endXNorm * (foam.width - 1))));
  for (let x = start; x <= end; x++) {
    foam.data[row * foam.width + x] = intensity;
  }
  return foam;
}

describe('AI Player Integration', () => {
  it('logs real game dimensions', () => {
    console.log('=== REAL GAME DIMENSIONS ===');
    console.log(`Canvas: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);
    console.log(`Ocean: top=${oceanTop}, bottom=${oceanBottom} (height=${oceanBottom - oceanTop})`);
    console.log(`Shore: Y=${shoreY}, height=${SHORE_HEIGHT}`);
    console.log(`Travel duration: ${TRAVEL_DURATION}ms`);
    console.log(
      `Peak X: ${DEFAULT_BATHYMETRY.peakX} = ${DEFAULT_BATHYMETRY.peakX * CANVAS_WIDTH}px`
    );
    console.log(`Peak starts at progress: ${DEFAULT_BATHYMETRY.peakStartProgress}`);

    const expertTarget = 0.58 * (oceanBottom - oceanTop) + oceanTop;
    console.log(`Expert target Y (0.58 progress): ${expertTarget}px`);

    expect(true).toBe(true);
  });

  it('AI paddles from spawn to target position', () => {
    // Create player at spawn position (on shore)
    // createPlayerProxy(canvasWidth, shoreY) - note the argument order!
    let player = createPlayerProxy(CANVAS_WIDTH, shoreY);
    const aiState = createAIState(AI_MODE.EXPERT);

    // Create foam that will reach the player at the target position
    // Foam spawns at the peak (0.55 progress = 330px Y)
    const foamY = 0.58 * (oceanBottom - oceanTop) + oceanTop; // Same as expert target

    const foamGrid = createFoamGridBand(
      (foamY - oceanTop) / (oceanBottom - oceanTop),
      DEFAULT_BATHYMETRY.peakX - 0.15,
      DEFAULT_BATHYMETRY.peakX + 0.15,
      0.5
    );
    const world = {
      waves: [],
      foamGrid,
      gameTime: 0,
      bathymetry: DEFAULT_BATHYMETRY,
    };

    console.log('=== AI PADDLE TEST ===');
    console.log(`Player spawn: (${player.x}, ${player.y})`);

    const peakX = DEFAULT_BATHYMETRY.peakX * CANVAS_WIDTH;
    // Use minProgress as approximate target lineup position
    const targetLineup = aiState.config.minProgress;
    const targetY = oceanTop + (oceanBottom - oceanTop) * targetLineup;
    console.log(`Target position: (${peakX}, ${targetY})`);
    console.log(`Target lineup config: ${targetLineup}`);

    // Simulate 10 seconds of game time at 60fps
    const dt = 1 / 60;
    const frames = 60 * 10;

    let lastLogFrame = 0;
    for (let frame = 0; frame < frames; frame++) {
      world.gameTime = frame * dt * 1000;

      // Get AI input
      const input = updateAIPlayer(
        player,
        aiState,
        world,
        dt,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        oceanTop,
        oceanBottom,
        TRAVEL_DURATION
      );

      // Update player with input (same as real game)
      player = updatePlayerProxy(
        player,
        dt,
        input,
        world.foamGrid,
        shoreY,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        oceanTop,
        oceanBottom
      );

      // Log every 2 seconds
      if (frame - lastLogFrame >= 120) {
        lastLogFrame = frame;
        const dx = peakX - player.x;
        const dy = targetY - player.y;
        console.log(
          `Frame ${frame}: pos=(${Math.round(player.x)},${Math.round(player.y)}) dx=${Math.round(dx)} dy=${Math.round(dy)} input=${JSON.stringify(input)}`
        );
      }
    }

    // Calculate where the AI should end up (center of target zone)
    const defaultY =
      oceanTop +
      (oceanBottom - oceanTop) * ((aiState.config.minProgress + aiState.config.maxProgress) / 2);

    console.log(`Final position: (${Math.round(player.x)}, ${Math.round(player.y)})`);
    console.log(`Expected default Y (center of zone): ${Math.round(defaultY)}`);
    console.log(`Distance from peak X: ${Math.round(peakX - player.x)}`);
    console.log(`AI state: ${aiState.state}, waves caught: ${aiState.stats.wavesCaught}`);

    // Player should have moved into the ocean
    expect(player.y).toBeLessThan(shoreY); // Should have left the shore

    // Player should be in the target zone (0.55-0.90 progress)
    const minY = oceanTop + (oceanBottom - oceanTop) * aiState.config.minProgress;
    const maxY = oceanTop + (oceanBottom - oceanTop) * aiState.config.maxProgress;
    expect(player.y).toBeGreaterThanOrEqual(minY - 50); // Allow some tolerance
    expect(player.y).toBeLessThanOrEqual(maxY + 50);
  });

  it('AI catches wave when foam reaches them at target position', () => {
    const aiState = createAIState(AI_MODE.EXPERT);
    const peakX = DEFAULT_BATHYMETRY.peakX * CANVAS_WIDTH;
    // Use center of expert zone
    const targetY =
      oceanTop +
      (oceanBottom - oceanTop) * ((aiState.config.minProgress + aiState.config.maxProgress) / 2);

    // Start player already at target position
    let player = { x: peakX, y: targetY, vx: 0, vy: 0 };

    console.log('=== WAVE CATCH CYCLE TEST ===');
    console.log(`Player at target: (${player.x}, ${player.y})`);

    // Simulate wave arriving - foam at player's position
    const foamGrid = createFoamGridBand(
      (player.y - oceanTop) / (oceanBottom - oceanTop),
      DEFAULT_BATHYMETRY.peakX - 0.15,
      DEFAULT_BATHYMETRY.peakX + 0.15,
      0.5
    );
    const world = {
      waves: [],
      foamGrid,
      gameTime: 0,
      bathymetry: DEFAULT_BATHYMETRY,
    };

    // Run until AI catches wave (retry to handle 1% wipeout)
    for (let attempt = 0; attempt < 10; attempt++) {
      aiState.state = AI_STATE.SEEKING;
      updateAIPlayer(
        player,
        aiState,
        world,
        1 / 60,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        oceanTop,
        oceanBottom,
        TRAVEL_DURATION
      );
      if (aiState.state === AI_STATE.RIDING) break;
    }

    expect(aiState.state).toBe(AI_STATE.RIDING);
    console.log(`Caught wave, now riding direction: ${aiState.rideDirection}`);

    // Simulate riding for 2 seconds
    const dt = 1 / 60;
    for (let frame = 0; frame < 120; frame++) {
      world.gameTime = frame * dt * 1000;
      // Keep foam at player position while riding
      const input = updateAIPlayer(
        player,
        aiState,
        world,
        dt,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        oceanTop,
        oceanBottom,
        TRAVEL_DURATION
      );
      player = updatePlayerProxy(
        player,
        dt,
        input,
        world.foamGrid,
        shoreY,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        oceanTop,
        oceanBottom
      );
    }

    console.log(
      `After 2s ride: pos=(${Math.round(player.x)}, ${Math.round(player.y)}), state=${aiState.state}`
    );

    // AI should still be riding (foam is still present)
    expect(aiState.state).toBe(AI_STATE.RIDING);

    // Now simulate foam dissipating
    world.foamGrid = createFoamGridBand(0.1, 0, 0, 0); // empty grid
    aiState.rideTimer = 1.0; // Already riding for a while

    updateAIPlayer(
      player,
      aiState,
      world,
      dt,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      oceanTop,
      oceanBottom,
      TRAVEL_DURATION
    );

    console.log(`After foam ends: state=${aiState.state}`);
    expect(aiState.state).toBe(AI_STATE.SEEKING); // Should go back to seeking foam
  });

  it('AI reaches target and catches foam', () => {
    const aiState = createAIState(AI_MODE.EXPERT);
    const peakX = DEFAULT_BATHYMETRY.peakX * CANVAS_WIDTH;
    // Use a position in the expert zone
    const targetY = oceanTop + (oceanBottom - oceanTop) * 0.7;

    // Start player at target position
    let player = { x: peakX, y: targetY, vx: 0, vy: 0 };

    console.log('=== FOAM CATCH TEST ===');
    console.log(`Player at target: (${player.x}, ${player.y})`);

    // Create foam at the player position
    const foamGrid = createFoamGridBand(
      (targetY - oceanTop) / (oceanBottom - oceanTop),
      DEFAULT_BATHYMETRY.peakX - 0.1,
      DEFAULT_BATHYMETRY.peakX + 0.1,
      0.5
    );
    const world = {
      waves: [],
      foamGrid,
      gameTime: 100,
      bathymetry: DEFAULT_BATHYMETRY,
    };

    // Run until caught (retry for wipeout chance)
    for (let attempt = 0; attempt < 10; attempt++) {
      aiState.state = AI_STATE.SEEKING;
      updateAIPlayer(
        player,
        aiState,
        world,
        1 / 60,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        oceanTop,
        oceanBottom,
        TRAVEL_DURATION
      );
      if (aiState.state === AI_STATE.RIDING) break;
    }

    console.log(`AI state after foam: ${aiState.state}`);
    console.log(`Waves caught: ${aiState.stats.wavesCaught}`);

    expect(aiState.state).toBe(AI_STATE.RIDING);
  });

  it('verifies coordinate system', () => {
    const aiState = createAIState(AI_MODE.EXPERT);

    console.log('=== COORDINATE SYSTEM ===');
    console.log('Y=0 is at TOP of screen (horizon)');
    console.log(`Y=${oceanBottom} is at BOTTOM of ocean (shore line)`);
    console.log(`Y=${shoreY} is where shore starts`);
    console.log('');
    console.log('Progress 0.0 = horizon (Y=0)');
    console.log('Progress 1.0 = shore (Y=oceanBottom)');
    console.log(
      `Expert zone: ${aiState.config.minProgress}-${aiState.config.maxProgress} progress`
    );
    console.log(
      `Expert zone Y: ${aiState.config.minProgress * oceanBottom}-${aiState.config.maxProgress * oceanBottom}px`
    );
    console.log(
      `Peak starts at progress ${DEFAULT_BATHYMETRY.peakStartProgress} = Y=${DEFAULT_BATHYMETRY.peakStartProgress * oceanBottom}`
    );

    // Verify expert zone starts at the peak
    const peakStartProgress = DEFAULT_BATHYMETRY.peakStartProgress; // 0.55

    console.log('');
    console.log(
      `Expert min (${aiState.config.minProgress}) >= peak start (${peakStartProgress}): ${aiState.config.minProgress >= peakStartProgress}`
    );

    expect(aiState.config.minProgress).toBeGreaterThanOrEqual(peakStartProgress);
  });
});
