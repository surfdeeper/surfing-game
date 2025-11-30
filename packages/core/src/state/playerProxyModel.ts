// Player Proxy Model
// A simple dot for testing movement before full surfer physics (Plan 71)
//
// The proxy can move on shore or water at different speeds.
// When in whitewater (foam zones), it gets pushed toward shore.
// Player must hold up arrow to resist the push.

import { sampleFoamGrid } from './foamGridModel.js';

// Default config - can be overridden at runtime via debug panel
export const DEFAULT_PLAYER_CONFIG = {
  radius: 8,

  // Movement speeds (px/s)
  shoreSpeed: 100, // Walking on sand
  waterSpeed: 30, // Paddling in calm water
  foamSpeed: 35, // Paddling in foam (adrenaline helps!)

  // Acceleration/deceleration (px/s^2)
  acceleration: 400,
  deceleration: 200,

  // Whitewater interaction
  // Breakeven at ~50% intensity: player can push through light/medium foam
  // but heavy foam (0.7+) overwhelms them
  maxPushForce: 50, // px/s at intensity 1.0
  foamSpeedPenalty: 0.4, // 40% speed reduction at max foam
};

// Runtime config - starts as copy of defaults, can be modified
export const PLAYER_PROXY_CONFIG = { ...DEFAULT_PLAYER_CONFIG };

/**
 * Create initial player proxy state
 * @param {number} canvasWidth
 * @param {number} shoreY - Y position of shore line
 */
export function createPlayerProxy(canvasWidth, shoreY) {
  return {
    x: canvasWidth / 2,
    y: shoreY + 30, // Start on shore
    vx: 0,
    vy: 0,
  };
}

/**
 * Determine which zone the player is in
 * @param {number} y - Player Y position
 * @param {number} shoreY - Shore line Y position
 * @returns {'SHORE' | 'WATER'}
 */
export function getZone(y, shoreY) {
  return y > shoreY ? 'SHORE' : 'WATER';
}

/**
 * Get base movement speed for a zone
 * @param {'SHORE' | 'WATER'} zone
 * @param {object} config
 */
function getZoneSpeed(zone, config) {
  return zone === 'SHORE' ? config.shoreSpeed : config.waterSpeed;
}

/**
 * Sample foam intensity at a given position
 * @param {number} x - Screen X position
 * @param {number} y - Screen Y position
 * @param {object} foamGrid - Foam density grid
 * @param {number} canvasWidth
 * @param {number} oceanTop
 * @param {number} oceanBottom
 * @returns {number} Intensity 0-1
 */
export function sampleFoamIntensity(x, y, foamGrid, canvasWidth, oceanTop, oceanBottom) {
  const normalizedX = x / canvasWidth;
  const normalizedY = Math.max(0, Math.min(1, (y - oceanTop) / (oceanBottom - oceanTop)));
  return sampleFoamGrid(foamGrid, normalizedX, normalizedY);
}

/**
 * Calculate whitewater push force
 * @param {number} foamIntensity - 0-1 intensity value
 * @param {object} config
 * @returns {{x: number, y: number}} Push velocity in px/s
 */
function getWhitewaterPush(foamIntensity, config) {
  if (foamIntensity <= 0) {
    return { x: 0, y: 0 };
  }
  // Push toward shore (positive Y direction)
  const pushStrength = foamIntensity * config.maxPushForce;
  return { x: 0, y: pushStrength };
}

/**
 * Update player proxy physics
 * @param {object} player - Player state {x, y, vx, vy}
 * @param {number} dt - Delta time in seconds
 * @param {object} input - Keyboard state {left, right, up, down}
 * @param {object} foamGrid - Foam grid for whitewater detection
 * @param {number} shoreY - Shore line Y position
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {number} oceanTop
 * @param {number} oceanBottom
 * @param {object} config - PLAYER_PROXY_CONFIG
 * @returns {object} Updated player state
 */
export function updatePlayerProxy(
  player,
  dt,
  input,
  foamGrid,
  shoreY,
  canvasWidth,
  canvasHeight,
  oceanTop,
  oceanBottom,
  config = PLAYER_PROXY_CONFIG
) {
  // 1. Determine zone and base speed
  const zone = getZone(player.y, shoreY);
  const baseSpeed = getZoneSpeed(zone, config);

  // 2. Calculate input direction (normalized)
  let inputX = 0,
    inputY = 0;
  if (input.left) inputX -= 1;
  if (input.right) inputX += 1;
  if (input.up) inputY -= 1; // Up = toward horizon (negative Y)
  if (input.down) inputY += 1; // Down = toward shore (positive Y)

  const inputMag = Math.sqrt(inputX * inputX + inputY * inputY);
  if (inputMag > 0) {
    inputX /= inputMag;
    inputY /= inputMag;
  }

  // 3. Sample foam intensity at player position
  const foamIntensity = sampleFoamIntensity(
    player.x,
    player.y,
    foamGrid,
    canvasWidth,
    oceanTop,
    oceanBottom
  );

  // 4. Calculate effective speed (reduced in foam)
  const speedMultiplier = 1 - foamIntensity * config.foamSpeedPenalty;
  const effectiveSpeed = (foamIntensity > 0 ? config.foamSpeed : baseSpeed) * speedMultiplier;

  // 5. Calculate target velocity from input
  const targetVx = inputX * effectiveSpeed;
  const targetVy = inputY * effectiveSpeed;

  // 6. Get whitewater push
  const push = getWhitewaterPush(foamIntensity, config);

  // 7. Combine: target velocity + push force
  const combinedTargetVx = targetVx + push.x;
  const combinedTargetVy = targetVy + push.y;

  // 8. Smooth acceleration toward target
  const accelRate = inputMag > 0 ? config.acceleration : config.deceleration;
  const accelFactor = Math.min(1, accelRate * dt);

  const newVx = player.vx + (combinedTargetVx - player.vx) * accelFactor;
  const newVy = player.vy + (combinedTargetVy - player.vy) * accelFactor;

  // 9. Update position
  let newX = player.x + newVx * dt;
  let newY = player.y + newVy * dt;

  // 10. Clamp to screen bounds
  const margin = config.radius;
  newX = Math.max(margin, Math.min(canvasWidth - margin, newX));
  newY = Math.max(margin, Math.min(canvasHeight - margin, newY));

  return {
    x: newX,
    y: newY,
    vx: newVx,
    vy: newVy,
  };
}

/**
 * Draw the player proxy
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player - Player state {x, y}
 * @param {number} foamIntensity - Current foam intensity (for visual feedback)
 * @param {object} config
 */
export function drawPlayerProxy(ctx, player, foamIntensity = 0, config = PLAYER_PROXY_CONFIG) {
  ctx.save();

  // Main circle
  ctx.beginPath();
  ctx.arc(player.x, player.y, config.radius, 0, Math.PI * 2);

  // Color shifts based on foam (getting redder = more danger)
  const r = Math.floor(255);
  const g = Math.floor(107 - foamIntensity * 50);
  const b = Math.floor(107 - foamIntensity * 50);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fill();

  // White outline
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Visual feedback when being pushed (subtle stretch effect)
  if (foamIntensity > 0.3) {
    ctx.beginPath();
    ctx.arc(player.x, player.y + config.radius * 0.5, config.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${foamIntensity * 0.5})`;
    ctx.fill();
  }

  ctx.restore();
}
