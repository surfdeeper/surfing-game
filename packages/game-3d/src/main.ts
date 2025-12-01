/**
 * Surfing Game 3D - Three.js Renderer
 *
 * A Three.js implementation that renders the same simulation
 * as the 2D canvas game, with FPS camera controls (WASD + mouse look),
 * debug UI, and player visualization.
 */

import * as THREE from 'three';
import { getStore, EventType } from '@surf/core/src/state/eventStore.js';
import { getDepth } from '@surf/core/src/layers/01-bottom-depth/index.js';
import { getOceanBounds, calculateTravelDuration } from '@surf/core/src/render/coordinates.js';
import {
  updateEnergyField,
  injectWavePulse,
  FIELD_WIDTH,
  FIELD_HEIGHT,
} from '@surf/core/src/layers/03-energy-field/index.js';
import { WAVE_TYPE, getWaveProgress } from '@surf/core/src/state/waveModel.js';
import { updateWaveSpawning, updateWaves } from '@surf/core/src/update/index.js';
import {
  createDebugPanelManager,
  type DebugPanelProps,
  type Toggles,
  type CameraConfig,
} from '@surf/debug-ui/src/index.js';
import { extractLineSegments, boxBlur } from '@surf/core/src/render/marchingSquares.js';
import { FOAM_GRID_WIDTH, FOAM_GRID_HEIGHT } from '@surf/core/src/state/foamGridModel.js';
import {
  updatePlayerProxy,
  createPlayerProxy,
  PLAYER_PROXY_CONFIG,
} from '@surf/core/src/state/playerProxyModel.js';

// Wave object type (matches createWave return)
interface WaveObject {
  id: string;
  type: string;
  amplitude: number;
  spawnTime: number;
  progressPerX: number[];
}
import '@surf/debug-ui/src/DebugPanel.css';
import {
  KeyboardInput,
  AI_MODE,
  createAIState,
  cycleAIMode,
  type AIModeType,
  updateAIPlayer,
} from '@surf/player/src/index.js';

// ============================================================================
// Three.js Scene Setup
// ============================================================================

const scene = new THREE.Scene();

// Sky gradient background (horizon effect)
const skyColor = new THREE.Color(0x87ceeb); // Light blue sky
const horizonColor = new THREE.Color(0xb0c4de); // Lighter blue at horizon
scene.background = skyColor;
scene.fog = new THREE.Fog(horizonColor, 50, 200); // Fog for depth

// Perspective camera - top-down view looking at energy field
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

// Camera state (controlled via debug panel)
const cameraState = {
  height: 25,
  distance: -15, // How far back from center (negative = toward shore, positive = toward ocean)
  tilt: -70, // Degrees from horizontal (-90 = straight down, 0 = horizontal)
};

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Hide the blocker/instructions since we don't use pointer lock
const blocker = document.getElementById('blocker');
const helpOverlay = document.getElementById('help-overlay');
if (blocker) blocker.style.display = 'none';
if (helpOverlay) helpOverlay.style.display = 'none';

// ============================================================================
// Ocean Geometry - Extends to Horizon
// ============================================================================

// Large ocean plane - extends far beyond visible area
const OCEAN_SIZE = 400; // Very large to reach horizon
const ENERGY_FIELD_SCALE = 40; // How big the energy field area is in world units

// Create ocean floor plane (base blue)
const oceanGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE);
const oceanMaterial = new THREE.MeshBasicMaterial({
  color: 0x0a2840, // Deep ocean blue
  side: THREE.DoubleSide,
});
const oceanFloor = new THREE.Mesh(oceanGeometry, oceanMaterial);
oceanFloor.rotation.x = -Math.PI / 2; // Lay flat
oceanFloor.position.y = -0.1; // Slightly below water
scene.add(oceanFloor);

// Energy field data texture (the active simulation area)
const textureData = new Uint8Array(FIELD_WIDTH * FIELD_HEIGHT * 4); // RGBA
const energyTexture = new THREE.DataTexture(
  textureData,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  THREE.RGBAFormat
);
energyTexture.needsUpdate = true;
energyTexture.magFilter = THREE.LinearFilter;
energyTexture.minFilter = THREE.LinearFilter;

// Energy field plane (where waves are visible)
// Calculate field dimensions in world units
const ENERGY_FIELD_DEPTH = ENERGY_FIELD_SCALE * (FIELD_HEIGHT / FIELD_WIDTH); // ~25 units
const energyPlaneGeometry = new THREE.PlaneGeometry(ENERGY_FIELD_SCALE, ENERGY_FIELD_DEPTH);
const energyPlaneMaterial = new THREE.MeshBasicMaterial({
  map: energyTexture,
  side: THREE.DoubleSide,
  transparent: true,
});
const energyFieldPlane = new THREE.Mesh(energyPlaneGeometry, energyPlaneMaterial);
energyFieldPlane.rotation.x = -Math.PI / 2; // Lay flat
energyFieldPlane.rotation.z = Math.PI; // Flip so waves move toward shore (low Z)
// Position so shore edge (low Z side) abuts the shore plane (which ends at Z=5)
// Energy field extends ENERGY_FIELD_DEPTH/2 in each direction from center
energyFieldPlane.position.set(0, 0.01, 5 + ENERGY_FIELD_DEPTH / 2);
scene.add(energyFieldPlane);

// Bathymetry visualization plane (depth coloring)
const bathyTextureData = new Uint8Array(FIELD_WIDTH * FIELD_HEIGHT * 4);
const bathymetryTexture = new THREE.DataTexture(
  bathyTextureData,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  THREE.RGBAFormat
);
bathymetryTexture.needsUpdate = true;
bathymetryTexture.magFilter = THREE.LinearFilter;
bathymetryTexture.minFilter = THREE.LinearFilter;

const bathymetryMaterial = new THREE.MeshBasicMaterial({
  map: bathymetryTexture,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.5,
});
const bathymetryPlane = new THREE.Mesh(energyPlaneGeometry.clone(), bathymetryMaterial);
bathymetryPlane.rotation.x = -Math.PI / 2;
bathymetryPlane.rotation.z = Math.PI; // Match energy field orientation
bathymetryPlane.position.set(0, 0.02, 5 + ENERGY_FIELD_DEPTH / 2); // Match energy field position
bathymetryPlane.visible = false; // Controlled by toggle
scene.add(bathymetryPlane);

// Shore/beach plane - extends far inland (behind camera view)
// Make it large enough that you can't see water behind it when looking around
const SHORE_SIZE = 800; // Very large to ensure no water visible behind shore
const shoreGeometry = new THREE.PlaneGeometry(SHORE_SIZE, SHORE_SIZE);
const shoreMaterial = new THREE.MeshBasicMaterial({
  color: 0xd4b896, // Sandy color
  side: THREE.DoubleSide,
});
const shorePlane = new THREE.Mesh(shoreGeometry, shoreMaterial);
shorePlane.rotation.x = -Math.PI / 2;
// Position so front edge is at Z=5 (where energy field starts), extends far back
shorePlane.position.set(0, 0.02, 5 - SHORE_SIZE / 2);
scene.add(shorePlane);

// Horizon water plane - extends into distance (beyond energy field)
const horizonGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE);
const horizonMaterial = new THREE.MeshBasicMaterial({
  color: 0x1a4060, // Slightly lighter distant ocean
  side: THREE.DoubleSide,
});
const horizonPlane = new THREE.Mesh(horizonGeometry, horizonMaterial);
horizonPlane.rotation.x = -Math.PI / 2;
horizonPlane.position.set(0, -0.05, 5 + ENERGY_FIELD_DEPTH + 100); // Beyond energy field
scene.add(horizonPlane);

// ============================================================================
// Wave Band Visualization
// ============================================================================

// Wave colors matching 2D game
const WAVE_COLORS = {
  set: {
    peak: new THREE.Color(0x0d3a5c), // Deep blue at peaks
    trough: new THREE.Color(0x2e7aa8), // Lighter blue at troughs
  },
  background: {
    peak: new THREE.Color(0x2a5a7e), // Muted peak
    trough: new THREE.Color(0x5a9ac0), // Desaturated trough
  },
};

// Pool of wave band meshes (reused each frame)
const MAX_WAVE_BANDS = 20;
const waveBandMeshes: THREE.Mesh[] = [];
const waveBandGroup = new THREE.Group();
scene.add(waveBandGroup);

// Create wave band mesh pool
for (let i = 0; i < MAX_WAVE_BANDS; i++) {
  // Each wave band is a thin horizontal strip
  const bandGeometry = new THREE.PlaneGeometry(ENERGY_FIELD_SCALE, 1); // Width matches field, height varies
  const bandMaterial = new THREE.MeshBasicMaterial({
    color: 0x2e7aa8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
  });
  const bandMesh = new THREE.Mesh(bandGeometry, bandMaterial);
  bandMesh.rotation.x = -Math.PI / 2;
  bandMesh.visible = false;
  waveBandGroup.add(bandMesh);
  waveBandMeshes.push(bandMesh);
}

// ============================================================================
// Foam Samples (Debug Points)
// ============================================================================

const foamSamplesGeometry = new THREE.BufferGeometry();
const foamSamplesPositions = new Float32Array(FOAM_GRID_WIDTH * FOAM_GRID_HEIGHT * 3);
const foamSamplesColors = new Float32Array(FOAM_GRID_WIDTH * FOAM_GRID_HEIGHT * 3);
foamSamplesGeometry.setAttribute('position', new THREE.BufferAttribute(foamSamplesPositions, 3));
foamSamplesGeometry.setAttribute('color', new THREE.BufferAttribute(foamSamplesColors, 3));

const foamSamplesMaterial = new THREE.PointsMaterial({
  size: 0.3,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
});
const foamSamplesPoints = new THREE.Points(foamSamplesGeometry, foamSamplesMaterial);
foamSamplesPoints.visible = false;
scene.add(foamSamplesPoints);

// ============================================================================
// Foam Zones (Marching Squares Contours)
// ============================================================================

// Base foam contours (white)
const FOAM_THRESHOLDS = [
  { value: 0.15, color: 0xffffff, opacity: 0.3, lineWidth: 1 },
  { value: 0.3, color: 0xffffff, opacity: 0.6, lineWidth: 2 },
  { value: 0.5, color: 0xffffff, opacity: 0.9, lineWidth: 3 },
];

// Option A contours (red tones)
const FOAM_THRESHOLDS_A = [
  { value: 0.15, color: 0xff6464, opacity: 0.4, lineWidth: 1 },
  { value: 0.3, color: 0xff9664, opacity: 0.7, lineWidth: 2 },
  { value: 0.5, color: 0xffc896, opacity: 0.9, lineWidth: 3 },
];

// Option B contours (green tones)
const FOAM_THRESHOLDS_B = [
  { value: 0.15, color: 0x64ff64, opacity: 0.4, lineWidth: 1 },
  { value: 0.3, color: 0x96ff96, opacity: 0.7, lineWidth: 2 },
  { value: 0.5, color: 0xc8ffc8, opacity: 0.9, lineWidth: 3 },
];

// Option C contours (purple tones)
const FOAM_THRESHOLDS_C = [
  { value: 0.15, color: 0x9664ff, opacity: 0.4, lineWidth: 1 },
  { value: 0.3, color: 0xb496ff, opacity: 0.7, lineWidth: 2 },
  { value: 0.5, color: 0xdcc8ff, opacity: 0.9, lineWidth: 3 },
];

// Contour line groups (one per threshold level, one set per foam option)
const contourGroups = {
  base: FOAM_THRESHOLDS.map(() => new THREE.Group()),
  optionA: FOAM_THRESHOLDS_A.map(() => new THREE.Group()),
  optionB: FOAM_THRESHOLDS_B.map(() => new THREE.Group()),
  optionC: FOAM_THRESHOLDS_C.map(() => new THREE.Group()),
};

// Add all contour groups to scene
Object.values(contourGroups)
  .flat()
  .forEach((group) => {
    group.visible = false;
    scene.add(group);
  });

// ============================================================================
// Camera Setup (after geometry constants are defined)
// ============================================================================

// Update camera from state
function updateCameraFromState(): void {
  const fieldCenterZ = 5 + ENERGY_FIELD_DEPTH / 2; // Center of energy field
  const fieldFarEdgeZ = 5 + ENERGY_FIELD_DEPTH; // Ocean-side edge of energy field

  // Position camera above, offset from center
  camera.position.set(0, cameraState.height, fieldCenterZ + cameraState.distance);

  // Look toward the far edge of the energy field (toward ocean)
  // This makes the camera look away from shore
  const lookTarget = new THREE.Vector3(0, 0, fieldFarEdgeZ);
  camera.lookAt(lookTarget);

  // Apply tilt - rotate down from horizontal view
  // tilt of -70 means looking 70 degrees below horizontal
  const additionalTilt = ((90 + cameraState.tilt) * Math.PI) / 180;
  if (additionalTilt !== 0) {
    camera.rotateX(-additionalTilt);
  }
}

// Initialize camera position
updateCameraFromState();

// ============================================================================
// Player Visualization
// ============================================================================

// Player mesh (surfer representation)
const playerGeometry = new THREE.ConeGeometry(0.3, 1, 8);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600 });
const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
playerMesh.rotation.x = Math.PI / 2; // Point forward
playerMesh.visible = false; // Controlled by toggle
scene.add(playerMesh);

// Surfboard under player
const boardGeometry = new THREE.BoxGeometry(0.3, 0.05, 1.5);
const boardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
boardMesh.visible = false;
scene.add(boardMesh);

// AI indicator (shows what keys AI is pressing)
const aiIndicatorGroup = new THREE.Group();
aiIndicatorGroup.visible = false;
scene.add(aiIndicatorGroup);

// Player state - uses screen coordinates (like 2D game) for physics compatibility
// Will be converted to world coordinates for 3D rendering
// Initialized lazily after we have ocean bounds
let playerProxy: { x: number; y: number; vx: number; vy: number } | null = null;

// ============================================================================
// Simulation State (from @surf/core)
// ============================================================================

const store = getStore();
let world = store.getState();

// ============================================================================
// Debug UI and Controls Setup
// ============================================================================

const debugPanelManager = createDebugPanelManager('ui-root');
const keyboardInput = new KeyboardInput();
let aiState = createAIState(AI_MODE.INTERMEDIATE);
let timeScale = 1.0;
let _lastAIInput = { left: false, right: false, up: false, down: false };

// Toggles state for debug panel
const toggles: Toggles = {
  showBathymetry: false,
  showSetWaves: true,
  showBackgroundWaves: true,
  showEnergyField: true,
  showFoamSamples: false,
  showFoamZones: true,
  showPlayer: false,
  showAIPlayer: false,
  showFoamOptionA: false,
  showFoamOptionB: false,
  showFoamOptionC: false,
  depthDampingCoefficient: 1.5,
  depthDampingExponent: 2.0,
};

// FPS tracking
let fps = 60;
let frameCount = 0;
let lastFpsUpdate = 0;

const virtualCanvasHeight = 800;

// ============================================================================
// Bathymetry Texture Update
// ============================================================================

function updateBathymetryTexture(): void {
  if (!world.bathymetry) return;

  for (let y = 0; y < FIELD_HEIGHT; y++) {
    for (let x = 0; x < FIELD_WIDTH; x++) {
      const normalizedX = x / (FIELD_WIDTH - 1);
      const normalizedY = y / (FIELD_HEIGHT - 1);
      const depth = getDepth(normalizedX, world.bathymetry, normalizedY);

      // Color by depth: shallow = light, deep = dark
      const depthNorm = Math.min(1, depth / 30); // Normalize to 0-1
      const r = Math.floor(20 + (1 - depthNorm) * 80);
      const g = Math.floor(60 + (1 - depthNorm) * 120);
      const b = Math.floor(100 + (1 - depthNorm) * 100);

      const texY = FIELD_HEIGHT - 1 - y;
      const texIdx = (texY * FIELD_WIDTH + x) * 4;
      bathyTextureData[texIdx] = r;
      bathyTextureData[texIdx + 1] = g;
      bathyTextureData[texIdx + 2] = b;
      bathyTextureData[texIdx + 3] = 180; // Semi-transparent
    }
  }
  bathymetryTexture.needsUpdate = true;
}

// Initialize bathymetry texture
updateBathymetryTexture();

// ============================================================================
// Enhanced Color Mapping
// ============================================================================

const COLOR_AMPLIFY = 4.0;

/**
 * Map energy field height to RGB color
 */
function heightToColor(height: number): [number, number, number] {
  const amplified = height * COLOR_AMPLIFY;
  const h = Math.max(-1, Math.min(1, amplified));

  const baseR = 10;
  const baseG = 40;
  const baseB = 70;

  if (h > 0) {
    const t = h;
    const t2 = t * t;
    return [
      Math.floor(baseR + (200 - baseR) * t + 55 * t2),
      Math.floor(baseG + (255 - baseG) * t),
      Math.floor(baseB + (255 - baseB) * t),
    ];
  } else {
    const t = -h;
    const t2 = t * t;
    return [
      Math.floor(baseR * (1 - t * 0.8) + 20 * t2),
      Math.floor(baseG * (1 - t * 0.6)),
      Math.floor(baseB * (1 - t * 0.3)),
    ];
  }
}

/**
 * Update the data texture from energy field
 */
function updateEnergyTexture(): void {
  const field = world.energyField;
  if (!field) return;

  const { height, width, gridHeight } = field;

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < width; x++) {
      const fieldIdx = y * width + x;
      const texY = gridHeight - 1 - y;
      const texIdx = (texY * width + x) * 4;

      const h = height[fieldIdx];
      const [r, g, b] = heightToColor(h);

      textureData[texIdx] = r;
      textureData[texIdx + 1] = g;
      textureData[texIdx + 2] = b;
      textureData[texIdx + 3] = 255;
    }
  }

  energyTexture.needsUpdate = true;
}

// ============================================================================
// Wave Spawning
// ============================================================================

function spawnWave(amplitude: number, type: string): void {
  store.dispatch({ type: EventType.WAVE_SPAWN, amplitude, waveType: type });
  world = store.getState();

  const energyMultiplier = type === WAVE_TYPE.SET ? 2.0 : 1.0;
  injectWavePulse(world.energyField, amplitude * energyMultiplier);
}

// ============================================================================
// Simulation Update
// ============================================================================

function updateSimulation(deltaTime: number): void {
  const scaledDelta = deltaTime * timeScale;

  store.dispatch({ type: EventType.GAME_TICK, deltaTime: scaledDelta * 1000 });
  world = store.getState();

  const { oceanBottom } = getOceanBounds(virtualCanvasHeight, world.shoreHeight);
  const energyTravelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed) / 1000;

  const getDepthForField = (normalizedX: number, normalizedY: number) =>
    getDepth(normalizedX, world.bathymetry, normalizedY);

  updateEnergyField(world.energyField, getDepthForField, scaledDelta, energyTravelDuration, {
    depthDampingCoefficient: toggles.depthDampingCoefficient,
    depthDampingExponent: toggles.depthDampingExponent,
  });

  const spawnResult = updateWaveSpawning(
    {
      setLullState: world.setLullState,
      setConfig: world.setConfig,
      backgroundState: world.backgroundState,
      backgroundConfig: world.backgroundConfig,
    },
    scaledDelta,
    world.gameTime
  );

  store.batchDispatch([
    { type: EventType.SET_LULL_UPDATE, setLullState: spawnResult.setLullState },
    { type: EventType.BACKGROUND_UPDATE, backgroundState: spawnResult.backgroundState },
  ]);
  world = store.getState();

  for (const event of spawnResult.events) {
    if (event.type === EventType.WAVE_SPAWN) {
      spawnWave(event.amplitude, event.waveType);
    }
  }

  const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);
  const bufferDuration = (world.swellSpacing / world.swellSpeed) * 1000;
  const updatedWaves = updateWaves(
    world.waves,
    world.gameTime,
    travelDuration,
    bufferDuration,
    world.bathymetry
  );
  store.dispatch({ type: EventType.WAVES_UPDATE, waves: updatedWaves });
  world = store.getState();
}

// ============================================================================
// Player Update (uses shared updatePlayerProxy from core)
// ============================================================================

// Virtual canvas dimensions for coordinate compatibility with 2D game
const virtualCanvasWidth = virtualCanvasHeight * (16 / 9);

function updatePlayer(deltaTime: number): void {
  if (!toggles.showPlayer) return;

  const { oceanTop, oceanBottom, shoreY } = getOceanBounds(virtualCanvasHeight, world.shoreHeight);
  const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);

  // Initialize player proxy lazily (needs ocean bounds)
  if (!playerProxy) {
    playerProxy = createPlayerProxy(virtualCanvasWidth, shoreY);
  }

  let input = keyboardInput.getKeys();

  // If AI player is enabled, get AI input
  if (toggles.showAIPlayer) {
    const aiInput = updateAIPlayer(
      playerProxy,
      aiState,
      world,
      deltaTime,
      virtualCanvasWidth,
      virtualCanvasHeight,
      oceanTop,
      oceanBottom,
      travelDuration
    );

    _lastAIInput = aiInput;
    input = aiInput;
  }

  // Use shared physics from core (same as 2D game)
  playerProxy = updatePlayerProxy(
    playerProxy,
    deltaTime,
    input,
    world.foamGrid,
    shoreY,
    virtualCanvasWidth,
    virtualCanvasHeight,
    oceanTop,
    oceanBottom,
    PLAYER_PROXY_CONFIG
  );
}

// ============================================================================
// Update 3D Scene from Toggle State
// ============================================================================

function updateSceneFromToggles(): void {
  // Energy field visibility
  energyFieldPlane.visible = toggles.showEnergyField;

  // Bathymetry visibility
  bathymetryPlane.visible = toggles.showBathymetry;

  // Player visibility
  playerMesh.visible = toggles.showPlayer;
  boardMesh.visible = toggles.showPlayer;
  aiIndicatorGroup.visible = toggles.showPlayer && toggles.showAIPlayer;

  // Foam samples visibility
  foamSamplesPoints.visible = toggles.showFoamSamples;

  // Update contour visibility
  updateContourVisibility();

  // Update player mesh position
  if (toggles.showPlayer && playerProxy) {
    // Convert screen coordinates to world coordinates
    const { oceanTop, oceanBottom } = getOceanBounds(virtualCanvasHeight, world.shoreHeight);
    const fieldWidth = ENERGY_FIELD_SCALE;
    const fieldDepth = ENERGY_FIELD_DEPTH;

    // Screen X (0 to canvasWidth) -> World X (+fieldWidth/2 to -fieldWidth/2)
    // Negated because camera looks toward +Z, so world +X appears on screen left
    const normalizedX = playerProxy.x / virtualCanvasWidth;
    const worldX = (0.5 - normalizedX) * fieldWidth;

    // Screen Y (oceanTop to oceanBottom) -> normalized (0 to 1) -> World Z
    // oceanTop = ocean side (high Z), oceanBottom = shore side (low Z)
    const normalizedY = (playerProxy.y - oceanTop) / (oceanBottom - oceanTop);
    const clampedY = Math.max(0, Math.min(1, normalizedY));
    // Y=0 (ocean) maps to high Z, Y=1 (shore) maps to low Z
    const worldZ = energyFieldPlane.position.z + (0.5 - clampedY) * fieldDepth;

    playerMesh.position.set(worldX, 0.5, worldZ);
    boardMesh.position.set(worldX, 0.1, worldZ);
    aiIndicatorGroup.position.set(worldX, 1.5, worldZ);
  }
}

// ============================================================================
// Wave Band Update
// ============================================================================

/**
 * Convert normalized progress (0=ocean, 1=shore) to world Z coordinate
 */
function progressToWorldZ(progress: number): number {
  // progress 0 = far ocean edge (high Z), progress 1 = shore edge (low Z)
  // Shore is at Z=5, ocean edge is at Z=5+ENERGY_FIELD_DEPTH
  const oceanZ = 5 + ENERGY_FIELD_DEPTH;
  return oceanZ - progress * ENERGY_FIELD_DEPTH;
}

/**
 * Update wave band meshes based on current waves
 */
function updateWaveBands(): void {
  const { oceanBottom } = getOceanBounds(virtualCanvasHeight, world.shoreHeight);
  const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);

  // Hide all bands first
  waveBandMeshes.forEach((mesh) => (mesh.visible = false));

  // Get visible waves
  const visibleWaves = world.waves
    .map((wave: WaveObject) => ({
      wave,
      progress: getWaveProgress(wave, world.gameTime, travelDuration),
    }))
    .filter(({ progress }: { progress: number }) => progress >= 0 && progress < 1);

  let bandIndex = 0;

  for (const { wave, progress } of visibleWaves) {
    if (bandIndex >= MAX_WAVE_BANDS) break;

    const isSetWave = wave.type === WAVE_TYPE.SET;
    const showThisWave = isSetWave ? toggles.showSetWaves : toggles.showBackgroundWaves;
    if (!showThisWave) continue;

    const mesh = waveBandMeshes[bandIndex];
    const material = mesh.material as THREE.MeshBasicMaterial;

    // Get wave colors
    const colors = isSetWave ? WAVE_COLORS.set : WAVE_COLORS.background;

    // Interpolate color based on amplitude
    const contrast = isSetWave ? wave.amplitude : wave.amplitude * 0.6;
    const color = colors.peak.clone().lerp(colors.trough, contrast);
    material.color = color;

    // Set opacity (set waves more opaque)
    material.opacity = isSetWave ? 0.7 : 0.5;

    // Calculate band thickness based on amplitude
    const minThickness = isSetWave ? 1.5 : 0.8;
    const maxThickness = isSetWave ? 4.0 : 2.0;
    const thickness = minThickness + (maxThickness - minThickness) * wave.amplitude;

    // Scale the mesh to the thickness
    mesh.scale.set(1, thickness, 1);

    // Position the band
    const worldZ = progressToWorldZ(progress);
    mesh.position.set(0, 0.05, worldZ);

    mesh.visible = true;
    bandIndex++;
  }
}

// ============================================================================
// Foam Samples Update
// ============================================================================

/**
 * Update foam sample points based on foam grid data
 */
function updateFoamSamples(): void {
  const foamGrid = world.energyTransferGrid?.lastFrame ?? world.foamGrid?.data;
  if (!foamGrid) return;

  const positions = foamSamplesGeometry.attributes.position.array as Float32Array;
  const colors = foamSamplesGeometry.attributes.color.array as Float32Array;

  const fieldWidth = ENERGY_FIELD_SCALE;
  const fieldDepth = ENERGY_FIELD_DEPTH;
  const shoreZ = 5;

  let idx = 0;
  for (let y = 0; y < FOAM_GRID_HEIGHT; y++) {
    for (let x = 0; x < FOAM_GRID_WIDTH; x++) {
      const gridIdx = y * FOAM_GRID_WIDTH + x;
      const value = foamGrid[gridIdx] ?? 0;

      // Convert grid coords to world coords
      const normalizedX = x / (FOAM_GRID_WIDTH - 1);
      const normalizedY = y / (FOAM_GRID_HEIGHT - 1);

      // X: -fieldWidth/2 to +fieldWidth/2
      const worldX = (normalizedX - 0.5) * fieldWidth;
      // Y: shore (low Z) to ocean (high Z)
      const worldZ = shoreZ + normalizedY * fieldDepth;

      positions[idx * 3] = worldX;
      positions[idx * 3 + 1] = 0.1 + value * 0.5; // Height based on foam intensity
      positions[idx * 3 + 2] = worldZ;

      // Color: white with intensity based on value
      colors[idx * 3] = 1.0;
      colors[idx * 3 + 1] = 1.0;
      colors[idx * 3 + 2] = 1.0;

      idx++;
    }
  }

  foamSamplesGeometry.attributes.position.needsUpdate = true;
  foamSamplesGeometry.attributes.color.needsUpdate = true;
}

// ============================================================================
// Foam Contour Update
// ============================================================================

/**
 * Convert normalized coordinates to world coordinates for contours
 */
function normalizedToWorld(normX: number, normY: number): [number, number, number] {
  const fieldWidth = ENERGY_FIELD_SCALE;
  const fieldDepth = ENERGY_FIELD_DEPTH;
  const shoreZ = 5;

  const worldX = (normX - 0.5) * fieldWidth;
  const worldZ = shoreZ + normY * fieldDepth;
  return [worldX, 0.15, worldZ]; // Slightly above ground
}

/**
 * Clear all line meshes from a group
 */
function clearContourGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }
}

/**
 * Render contours for a given grid and threshold configuration
 */
function renderContours(
  grid: Float32Array | number[],
  gridWidth: number,
  gridHeight: number,
  thresholds: { value: number; color: number; opacity: number; lineWidth: number }[],
  groups: THREE.Group[],
  blurPasses: number = 1
): void {
  // Apply blur to the grid
  const blurredGrid = boxBlur(Array.from(grid), gridWidth, gridHeight, blurPasses);

  // Clear existing contours
  groups.forEach((group) => clearContourGroup(group));

  // Extract and render contours for each threshold
  for (let i = 0; i < thresholds.length; i++) {
    const threshold = thresholds[i];
    const group = groups[i];

    const segments = extractLineSegments(blurredGrid, gridWidth, gridHeight, threshold.value);

    // Create line geometry from segments
    const points: THREE.Vector3[] = [];
    for (const segment of segments) {
      // extractLineSegments returns {x1, y1, x2, y2} objects
      const { x1, y1, x2, y2 } = segment;
      const [wx1, wy1, wz1] = normalizedToWorld(x1, y1);
      const [wx2, wy2, wz2] = normalizedToWorld(x2, y2);
      points.push(new THREE.Vector3(wx1, wy1, wz1));
      points.push(new THREE.Vector3(wx2, wy2, wz2));
    }

    if (points.length > 0) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: threshold.color,
        transparent: true,
        opacity: threshold.opacity,
        linewidth: threshold.lineWidth, // Note: linewidth may not work on all platforms
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      group.add(lines);
    }
  }
}

/**
 * Update all foam contour visualizations
 */
function updateFoamContours(): void {
  const foamGrid = world.energyTransferGrid?.lastFrame ?? world.foamGrid?.data;
  if (!foamGrid) return;

  // Base foam zones
  if (toggles.showFoamZones) {
    renderContours(
      foamGrid,
      FOAM_GRID_WIDTH,
      FOAM_GRID_HEIGHT,
      FOAM_THRESHOLDS,
      contourGroups.base,
      1
    );
  }

  // Option A
  if (toggles.showFoamOptionA) {
    renderContours(
      foamGrid,
      FOAM_GRID_WIDTH,
      FOAM_GRID_HEIGHT,
      FOAM_THRESHOLDS_A,
      contourGroups.optionA,
      2
    );
  }

  // Option B
  if (toggles.showFoamOptionB) {
    renderContours(
      foamGrid,
      FOAM_GRID_WIDTH,
      FOAM_GRID_HEIGHT,
      FOAM_THRESHOLDS_B,
      contourGroups.optionB,
      3
    );
  }

  // Option C
  if (toggles.showFoamOptionC) {
    renderContours(
      foamGrid,
      FOAM_GRID_WIDTH,
      FOAM_GRID_HEIGHT,
      FOAM_THRESHOLDS_C,
      contourGroups.optionC,
      4
    );
  }
}

/**
 * Update contour group visibility based on toggles
 */
function updateContourVisibility(): void {
  contourGroups.base.forEach((g) => (g.visible = toggles.showFoamZones));
  contourGroups.optionA.forEach((g) => (g.visible = toggles.showFoamOptionA));
  contourGroups.optionB.forEach((g) => (g.visible = toggles.showFoamOptionB));
  contourGroups.optionC.forEach((g) => (g.visible = toggles.showFoamOptionC));
}

// ============================================================================
// Debug Panel Rendering
// ============================================================================

function prepareDisplayWaves() {
  const { oceanBottom } = getOceanBounds(virtualCanvasHeight, world.shoreHeight);
  const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);

  return world.waves
    .map((wave: { id: string; type: string; amplitude: number; spawnTime: number }) => ({
      wave,
      progress: getWaveProgress(wave, world.gameTime, travelDuration),
      travelDuration,
    }))
    .filter(({ progress }: { progress: number }) => progress < 1)
    .sort((a: { progress: number }, b: { progress: number }) => a.progress - b.progress);
}

function renderDebugPanel(): void {
  const props: DebugPanelProps = {
    setLullState: world.setLullState,
    gameTime: world.gameTime,
    displayWaves: prepareDisplayWaves(),
    foamCount: world.foamGrid?.data?.filter((v: number) => v > 0).length ?? 0,
    energyTransferCount: 0,
    timeScale,
    onTimeScaleChange: (newScale: number) => {
      timeScale = newScale;
    },
    toggles,
    onToggle: (key: keyof Toggles) => {
      if (typeof toggles[key] === 'boolean') {
        (toggles as unknown as Record<string, boolean | number>)[key] = !toggles[key];
        // Update scene immediately when toggle changes
        updateSceneFromToggles();
      }
    },
    onSettingChange: (key: string, value: number) => {
      (toggles as unknown as Record<string, boolean | number>)[key] = value;
    },
    fps,
    playerConfig: undefined,
    onPlayerConfigChange: undefined,
    aiMode: aiState.mode,
    onAIModeChange: () => {
      aiState = createAIState(cycleAIMode(aiState.mode as AIModeType));
    },
    cameraConfig: cameraState as CameraConfig,
    onCameraConfigChange: (key: keyof CameraConfig, value: number) => {
      cameraState[key] = value;
      updateCameraFromState();
    },
  };

  debugPanelManager.render(props);
}

// ============================================================================
// Render Loop
// ============================================================================

let lastTime = 0;

function animate(timestamp: number): void {
  requestAnimationFrame(animate);

  const deltaTime = lastTime === 0 ? 0.016 : (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  const cappedDelta = Math.min(deltaTime, 0.1);

  // FPS calculation
  frameCount++;
  if (timestamp - lastFpsUpdate >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }

  // Step simulation
  updateSimulation(cappedDelta);

  // Update player
  updatePlayer(cappedDelta);

  // Update texture from energy field
  if (toggles.showEnergyField) {
    updateEnergyTexture();
  }

  // Update wave bands
  if (toggles.showSetWaves || toggles.showBackgroundWaves) {
    updateWaveBands();
  } else {
    // Hide all wave bands if neither toggle is on
    waveBandMeshes.forEach((mesh) => (mesh.visible = false));
  }

  // Update foam samples
  if (toggles.showFoamSamples) {
    updateFoamSamples();
  }

  // Update foam contours
  if (
    toggles.showFoamZones ||
    toggles.showFoamOptionA ||
    toggles.showFoamOptionB ||
    toggles.showFoamOptionC
  ) {
    updateFoamContours();
  }

  // Update scene visibility based on toggles
  updateSceneFromToggles();

  // Render Three.js scene
  renderer.render(scene, camera);

  // Render debug UI
  renderDebugPanel();
}

// ============================================================================
// Window Resize
// ============================================================================

function onResize(): void {
  const newAspect = window.innerWidth / window.innerHeight;

  camera.aspect = newAspect;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

// ============================================================================
// Keyboard Controls
// ============================================================================

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    // Utility keys
    case 'KeyT':
      // Cycle time scale
      const scales = [1, 2, 4, 8];
      const currentIndex = scales.indexOf(timeScale);
      timeScale = scales[(currentIndex + 1) % scales.length];
      break;
    case 'KeyM':
      // Cycle AI mode
      aiState = createAIState(cycleAIMode(aiState.mode as AIModeType));
      break;
  }
});

// ============================================================================
// Start
// ============================================================================

console.log('Surfing Game 3D - Three.js Renderer');
console.log(`Energy field: ${FIELD_WIDTH}x${FIELD_HEIGHT}`);
console.log('Use debug panel to adjust camera position');
console.log('Press T to cycle time scale, M to cycle AI mode');

requestAnimationFrame(animate);
