/**
 * Surfing Game 3D - Three.js Renderer
 *
 * A minimal Three.js implementation that renders the same simulation
 * as the 2D canvas game, but via a flat orthographic view in 3D.
 *
 * This is a foundation for future 3D features while maintaining
 * compatibility with the existing @surf/core physics.
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
import { WAVE_TYPE } from '@surf/core/src/state/waveModel.js';
import { updateWaveSpawning, updateWaves } from '@surf/core/src/update/index.js';

// ============================================================================
// Three.js Scene Setup
// ============================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a4a6e); // Ocean blue

// Orthographic camera for flat 2D view
// Coordinates: left=-1, right=1, top=1, bottom=-1
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 2;
const camera = new THREE.OrthographicCamera(
  (-frustumSize * aspect) / 2, // left
  (frustumSize * aspect) / 2, // right
  frustumSize / 2, // top
  -frustumSize / 2, // bottom
  0.1, // near
  100 // far
);
camera.position.z = 1;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ============================================================================
// Energy Field Visualization
// ============================================================================

// Create a DataTexture to visualize the energy field
// We'll update this texture each frame with energy field values
const textureData = new Uint8Array(FIELD_WIDTH * FIELD_HEIGHT * 4); // RGBA
const energyTexture = new THREE.DataTexture(
  textureData,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  THREE.RGBAFormat
);
energyTexture.needsUpdate = true;

// Plane geometry that fills the view
const planeWidth = frustumSize * aspect;
const planeHeight = frustumSize;
const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

// Material using our data texture
const material = new THREE.MeshBasicMaterial({
  map: energyTexture,
  side: THREE.DoubleSide,
});

const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// Shore strip (bottom of screen)
const shoreHeight = 0.15; // Proportion of screen
const shoreGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight * shoreHeight);
const shoreMaterial = new THREE.MeshBasicMaterial({ color: 0xc2a86e });
const shorePlane = new THREE.Mesh(shoreGeometry, shoreMaterial);
shorePlane.position.y = -planeHeight / 2 + (planeHeight * shoreHeight) / 2;
shorePlane.position.z = 0.01; // Slightly in front of ocean
scene.add(shorePlane);

// ============================================================================
// Simulation State (from @surf/core)
// ============================================================================

const store = getStore();
let world = store.getState();

// Config
const timeScale = 1.0;
const virtualCanvasHeight = 800; // Virtual canvas size for coordinate calculations

// ============================================================================
// Color Mapping
// ============================================================================

/**
 * Map energy field height to RGB color
 * Positive heights = lighter blue/white (wave crests)
 * Negative heights = darker blue (wave troughs)
 * Zero = ocean base color
 */
function heightToColor(height: number): [number, number, number] {
  const baseR = 26; // 0x1a
  const baseG = 74; // 0x4a
  const baseB = 110; // 0x6e

  // Clamp and normalize
  const normalizedHeight = Math.max(-1, Math.min(1, height));

  if (normalizedHeight > 0) {
    // Positive: blend toward white (wave crest)
    const t = normalizedHeight;
    return [
      Math.floor(baseR + (255 - baseR) * t),
      Math.floor(baseG + (255 - baseG) * t),
      Math.floor(baseB + (255 - baseB) * t),
    ];
  } else {
    // Negative: blend toward dark blue (wave trough)
    const t = -normalizedHeight;
    return [
      Math.floor(baseR * (1 - t * 0.5)),
      Math.floor(baseG * (1 - t * 0.3)),
      Math.floor(baseB * (1 - t * 0.2)),
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
      // Energy field: y=0 is horizon (top), y=gridHeight-1 is shore (bottom)
      // Texture: y=0 is bottom, so we flip Y
      const fieldIdx = y * width + x;
      const texY = gridHeight - 1 - y;
      const texIdx = (texY * width + x) * 4;

      const h = height[fieldIdx];
      const [r, g, b] = heightToColor(h);

      textureData[texIdx] = r;
      textureData[texIdx + 1] = g;
      textureData[texIdx + 2] = b;
      textureData[texIdx + 3] = 255; // Alpha
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

  // Inject pulse into energy field
  const energyMultiplier = type === WAVE_TYPE.SET ? 2.0 : 1.0;
  injectWavePulse(world.energyField, amplitude * energyMultiplier);
}

// ============================================================================
// Simulation Update
// ============================================================================

function updateSimulation(deltaTime: number): void {
  const scaledDelta = deltaTime * timeScale;

  // Advance game time
  store.dispatch({ type: EventType.GAME_TICK, deltaTime: scaledDelta * 1000 });
  world = store.getState();

  // Calculate travel duration based on virtual canvas
  const { oceanBottom } = getOceanBounds(virtualCanvasHeight, world.shoreHeight);
  const energyTravelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed) / 1000;

  // Depth lookup function for energy field
  const getDepthForField = (normalizedX: number, normalizedY: number) =>
    getDepth(normalizedX, world.bathymetry, normalizedY);

  // Update energy field
  updateEnergyField(world.energyField, getDepthForField, scaledDelta, energyTravelDuration, {
    depthDampingCoefficient: 1.5,
    depthDampingExponent: 2.0,
  });

  // Wave spawning via orchestrator
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

  // Apply state updates
  store.batchDispatch([
    { type: EventType.SET_LULL_UPDATE, setLullState: spawnResult.setLullState },
    { type: EventType.BACKGROUND_UPDATE, backgroundState: spawnResult.backgroundState },
  ]);
  world = store.getState();

  // Process spawn events
  for (const event of spawnResult.events) {
    if (event.type === EventType.WAVE_SPAWN) {
      spawnWave(event.amplitude, event.waveType);
    }
  }

  // Update wave lifecycle
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
// Render Loop
// ============================================================================

let lastTime = 0;

function animate(timestamp: number): void {
  requestAnimationFrame(animate);

  // Calculate delta time in seconds
  const deltaTime = lastTime === 0 ? 0.016 : (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Cap delta to prevent huge jumps (e.g., when tab is backgrounded)
  const cappedDelta = Math.min(deltaTime, 0.1);

  // Step simulation
  updateSimulation(cappedDelta);

  // Update texture from energy field
  updateEnergyTexture();

  // Render
  renderer.render(scene, camera);
}

// ============================================================================
// Window Resize
// ============================================================================

function onResize(): void {
  const newAspect = window.innerWidth / window.innerHeight;

  // Update camera frustum
  camera.left = (-frustumSize * newAspect) / 2;
  camera.right = (frustumSize * newAspect) / 2;
  camera.updateProjectionMatrix();

  // Update plane size
  const newPlaneWidth = frustumSize * newAspect;
  plane.geometry.dispose();
  plane.geometry = new THREE.PlaneGeometry(newPlaneWidth, planeHeight);

  // Update shore plane
  shorePlane.geometry.dispose();
  shorePlane.geometry = new THREE.PlaneGeometry(newPlaneWidth, planeHeight * shoreHeight);

  // Update renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

// ============================================================================
// Start
// ============================================================================

console.log('Surfing Game 3D - Three.js Renderer');
console.log(`Energy field: ${FIELD_WIDTH}x${FIELD_HEIGHT}`);
console.log('Press F12 for developer tools');

requestAnimationFrame(animate);
