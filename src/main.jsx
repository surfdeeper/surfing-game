// Surfing Game - Time-based wave model
// Wave position is derived from time, enabling deterministic tests
//
// Architecture:
// - Wave objects store spawnTime (immutable), not position
// - Position is calculated: progress = (currentTime - spawnTime) / travelDuration
// - Coordinates mapped: progress (0-1) → screen pixels at render time

import { WAVE_TYPE } from './state/waveModel.js';
import { getDepth } from './state/bathymetryModel.js';
import { createBathymetryCacheManager } from './render/bathymetryRenderer.js';
import { getOceanBounds, calculateTravelDuration } from './render/coordinates.js';
import { saveGameState, loadGameState, shouldAutoSave } from './state/gamePersistence.js';
import './state/backgroundWaveModel.js';  // Needed by eventStore
import {
    updateWaveSpawning,
    updateWaves,
    depositFoam,
    updateFoamLifecycle,
    depositFoamRows,
    updateFoamRowLifecycle,
    updatePlayer,
} from './update/index.js';
import { EventType, getStore } from './state/eventStore.js';
import { loadSettings, saveSettings } from './state/settingsModel.js';
import { createFpsTracker } from './util/fpsTracker.js';
import { createKeyboardHandler } from './input/keyboardHandler.js';
import {
    PLAYER_PROXY_CONFIG,
    createPlayerProxy,
    drawPlayerProxy,
    sampleFoamIntensity,
} from './state/playerProxyModel.js';
import {
    createAIState,
    drawAIKeyIndicator,
    AI_MODE,
} from './state/aiPlayerModel.js';
import {
    updateEnergyField,
    injectWavePulse,
} from './state/energyFieldModel.js';
import { renderEnergyField } from './render/energyFieldRenderer.js';
import { renderWaves } from './render/waveRenderer.js';
import { KeyboardInput } from './input/keyboard.js';
import { createDebugPanelManager } from './ui/debugPanelManager.js';
import {
    renderMultiContour,
    renderMultiContourOptionA,
    renderMultiContourOptionB,
    renderMultiContourOptionC,
} from './render/marchingSquares.js';
import { renderFoamContours } from './render/foamConfig.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Bathymetry cache manager (Plan 130) - handles caching + invalidation
const bathymetryCache = createBathymetryCacheManager();

// Make canvas fill the screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    bathymetryCache.invalidate();
}
resize();
window.addEventListener('resize', resize);

// Event store for game state (Plan 150)
// All state lives in the store, accessed via getState()
const store = getStore();

// World reference - points to store state for backwards compatibility
// Eventually this can be removed once all code uses store directly
let world = store.getState();

// Keyboard input for player movement (arrow keys / WASD)
const keyboard = new KeyboardInput();

// Colors (wave colors now in render/waveRenderer.js)
const colors = {
    ocean: '#1a4a6e',
    shore: '#c2a86e',
};

// Load settings from localStorage and apply to store
const savedSettings = loadSettings();

// Apply saved toggles to store
for (const [key, value] of Object.entries(savedSettings)) {
    if (key === 'timeScale') {
        store.dispatch({ type: EventType.TIME_SCALE_CHANGE, timeScale: value });
    } else if (typeof value === 'boolean') {
        store.dispatch({ type: EventType.TOGGLE_CHANGE, key, value });
    }
}
world = store.getState();

// Helper to get current toggles from store (replaces separate settings object)
const getToggles = () => store.getState().toggles;
const getTimeScale = () => store.getState().timeScale;

// Alias for backwards compatibility with E2E tests
let toggles = { ...world.toggles, timeScale: world.timeScale };

// Toggle handler for React UI - uses store dispatch + localStorage persistence
function handleToggle(key) {
    const currentValue = getToggles()[key];
    store.dispatch({ type: EventType.TOGGLE_CHANGE, key, value: !currentValue });
    world = store.getState();
    toggles = { ...world.toggles, timeScale: world.timeScale };  // Keep alias in sync

    // Persist to localStorage
    saveSettings({ ...world.toggles, timeScale: world.timeScale });

    // Initialize player proxy when first enabled via UI
    if (key === 'showPlayer' && world.toggles.showPlayer && !world.playerProxy) {
        const { shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
        store.dispatch({ type: EventType.PLAYER_INIT, playerProxy: createPlayerProxy(canvas.width, shoreY) });
        world = store.getState();
    }
}

// Time scale handler for React UI
function handleTimeScaleChange(newScale) {
    store.dispatch({ type: EventType.TIME_SCALE_CHANGE, timeScale: newScale });
    world = store.getState();
    toggles = { ...world.toggles, timeScale: world.timeScale };

    // Persist to localStorage
    saveSettings({ ...world.toggles, timeScale: world.timeScale });
}

// Player config handler for React UI
function handlePlayerConfigChange(key, value) {
    PLAYER_PROXY_CONFIG[key] = value;
}

// AI mode handler for React UI
function handleAIModeChange() {
    const modes = [AI_MODE.BEGINNER, AI_MODE.INTERMEDIATE, AI_MODE.EXPERT];
    const currentIdx = modes.indexOf(world.aiMode);
    const newMode = modes[(currentIdx + 1) % modes.length];
    store.dispatch({ type: EventType.AI_UPDATE, aiMode: newMode, aiState: createAIState(newMode) });
    world = store.getState();
    console.log(`[AI] Switched to ${world.aiMode} mode`);
}

// Debug panel manager (extracted to ui/debugPanelManager.js)
const debugPanel = createDebugPanelManager();

// Load saved state on startup
loadGameState(world, (timeScale) => {
    store.dispatch({ type: EventType.TIME_SCALE_CHANGE, timeScale });
    world = store.getState();
    toggles = { ...world.toggles, timeScale: world.timeScale };
});

// Initialize player proxy if it was enabled in a previous session
if (getToggles().showPlayer && !world.playerProxy) {
    const { shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
    store.dispatch({ type: EventType.PLAYER_INIT, playerProxy: createPlayerProxy(canvas.width, shoreY) });
    world = store.getState();
}

// Keyboard controls - extracted to input/keyboardHandler.js
createKeyboardHandler({
    onToggle: handleToggle,
    onTimeScaleChange: handleTimeScaleChange,
    onAIModeChange: handleAIModeChange,
    getToggles,
    getTimeScale,
});

// Spawn a wave at the horizon with the given amplitude and type
function spawnWave(amplitude, type) {
    store.dispatch({ type: EventType.WAVE_SPAWN, amplitude, waveType: type });
    world = store.getState();

    // Inject pulse into energy field to match discrete wave
    // Set waves have more energy (2x) than background waves
    if (toggles.showEnergyField) {
        const energyMultiplier = type === WAVE_TYPE.SET ? 2.0 : 1.0;
        injectWavePulse(world.energyField, amplitude * energyMultiplier);
    }
}

function update(deltaTime) {
    // Apply time scale for testing
    const scaledDelta = deltaTime * getTimeScale();

    // Advance game time via dispatch (Plan 150 event sourcing)
    store.dispatch({ type: EventType.GAME_TICK, deltaTime: scaledDelta * 1000 });
    world = store.getState();

    // Update energy field (Plan 140) - propagate existing energy toward shore
    if (toggles.showEnergyField) {
        const { oceanBottom } = getOceanBounds(canvas.height, world.shoreHeight);
        const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed) / 1000; // in seconds
        const getDepthForField = (normalizedX, normalizedY) =>
            getDepth(normalizedX, world.bathymetry, normalizedY);
        updateEnergyField(world.energyField, getDepthForField, scaledDelta, travelDuration);
    }

    // Update wave spawning via orchestrator (returns events + new state)
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

    // Apply state updates via dispatch
    store.dispatch({ type: EventType.SET_LULL_UPDATE, setLullState: spawnResult.setLullState });
    store.dispatch({ type: EventType.BACKGROUND_UPDATE, backgroundState: spawnResult.backgroundState });
    world = store.getState();

    // Process spawn events
    for (const event of spawnResult.events) {
        if (event.type === EventType.WAVE_SPAWN) {
            spawnWave(event.amplitude, event.waveType);
        }
    }

    // Update wave lifecycle (filter completed waves + update refraction) via orchestrator
    const { oceanBottom } = getOceanBounds(canvas.height, world.shoreHeight);
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

    // Foam state for orchestrator functions
    const foamState = {
        gameTime: world.gameTime,
        bathymetry: world.bathymetry,
        energyField: world.energyField,
        canvasHeight: canvas.height,
        shoreHeight: world.shoreHeight,
        swellSpeed: world.swellSpeed,
        showEnergyField: toggles.showEnergyField,
    };

    // Deposit foam segments (point-based) via orchestrator
    let updatedFoamSegments = depositFoam(world.waves, world.foamSegments, foamState);

    // Update foam lifecycle (fade and remove)
    updatedFoamSegments = updateFoamLifecycle(updatedFoamSegments, scaledDelta, world.gameTime);
    store.dispatch({ type: EventType.FOAM_SEGMENTS_UPDATE, foamSegments: updatedFoamSegments });
    world = store.getState();

    // Deposit foam rows (span-based) via orchestrator
    let updatedFoamRows = depositFoamRows(world.waves, world.foamRows, foamState);

    // Update foam row lifecycle (fade and remove)
    updatedFoamRows = updateFoamRowLifecycle(updatedFoamRows, world.gameTime);
    store.dispatch({ type: EventType.FOAM_ROWS_UPDATE, foamRows: updatedFoamRows });
    world = store.getState();

    // Update player proxy if enabled via orchestrator
    if (toggles.showPlayer && world.playerProxy) {
        const playerState = {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            shoreHeight: world.shoreHeight,
            swellSpeed: world.swellSpeed,
            foamRows: world.foamRows,
            deltaTime: scaledDelta,
            showAIPlayer: toggles.showAIPlayer,
            world,
        };

        const playerResult = updatePlayer(
            world.playerProxy,
            world.aiState,
            world.aiMode,
            keyboard.getKeys(),
            playerState
        );

        store.dispatch({
            type: EventType.PLAYER_UPDATE,
            playerProxy: playerResult.playerProxy,
            aiState: playerResult.aiState,
            lastAIInput: playerResult.lastAIInput,
        });
        world = store.getState();
    }

    // Save game state periodically (every ~1 second)
    if (shouldAutoSave(world.gameTime, world.gameTime - scaledDelta * 1000)) {
        saveGameState(world, { timeScale: getTimeScale() });
    }
}

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const { oceanTop, oceanBottom, shoreY } = getOceanBounds(h, world.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);

    // Clear with ocean color
    ctx.fillStyle = colors.ocean;
    ctx.fillRect(0, 0, w, h);

    // Draw bathymetry depth heat map UNDER waves (toggle with 'B' key)
    // Uses cache manager from render/bathymetryRenderer.js (Plan 130)
    if (toggles.showBathymetry) {
        const cache = bathymetryCache.get(w, oceanTop, oceanBottom, world.bathymetry);
        ctx.drawImage(cache, 0, 0);
    }

    // Draw energy field (Plan 140) - toggle with 'E' key
    // Renders as an alternative to discrete waves when enabled
    if (toggles.showEnergyField) {
        renderEnergyField(ctx, world.energyField, oceanTop, oceanBottom, w);
    }

    // Draw shore (bottom strip)
    ctx.fillStyle = colors.shore;
    ctx.fillRect(0, shoreY, w, world.shoreHeight);

    // Render waves using extracted helper (Plan 170 Phase 2)
    renderWaves(ctx, world.waves, {
        canvasWidth: w,
        oceanTop,
        oceanBottom,
        shoreY,
        gameTime: world.gameTime,
        travelDuration,
        showBathymetry: toggles.showBathymetry,
        showEnergyField: toggles.showEnergyField,
        energyField: world.energyField,
    }, {
        showSetWaves: toggles.showSetWaves,
        showBackgroundWaves: toggles.showBackgroundWaves,
    });

    // Foam contour rendering using extracted config (Plan 170)
    renderFoamContours(ctx, world.foamRows, w, h, world.gameTime, oceanBottom, getToggles(), {
        base: renderMultiContour,
        optionA: renderMultiContourOptionA,
        optionB: renderMultiContourOptionB,
        optionC: renderMultiContourOptionC,
    });

    // LAYER: Foam samples (debug view - original rectangle-based rendering)
    // Draw foam deposits as individual rectangles for debugging
    if (toggles.showFoamSamples) {
        const foamDotWidth = w / 80 + 2;  // Slightly wider than sample spacing for overlap
        const foamDotHeight = 4;  // Slightly taller than Y spacing (3) for overlap
        for (const foam of world.foamSegments) {
            if (foam.opacity <= 0) continue;

            const foamX = foam.x * w;

            // Draw foam as small rectangle at its fixed position
            ctx.fillStyle = `rgba(255, 255, 255, ${foam.opacity * 0.85})`;
            ctx.fillRect(foamX - foamDotWidth / 2, foam.y - foamDotHeight / 2, foamDotWidth, foamDotHeight);
        }
    }

    // LAYER: Player proxy (toggle with 'P' key)
    if (toggles.showPlayer && world.playerProxy) {
        const foamIntensity = sampleFoamIntensity(
            world.playerProxy.x,
            world.playerProxy.y,
            world.foamRows,
            w
        );
        drawPlayerProxy(ctx, world.playerProxy, foamIntensity, PLAYER_PROXY_CONFIG);

        // Draw AI key indicator in bottom right corner
        if (toggles.showAIPlayer && world.aiState) {
            drawAIKeyIndicator(ctx, world.lastAIInput, world.aiState, w - 60, h - 60);
        }
    }

    // Render React debug panel (extracted to ui/debugPanelManager.js)
    debugPanel.render({
        setLullState: world.setLullState,
        gameTime: world.gameTime,
        displayWaves: debugPanel.prepareDisplayWaves(world.waves, world.gameTime, travelDuration),
        foamCount: world.foamSegments.length,
        timeScale: getTimeScale(),
        onTimeScaleChange: handleTimeScaleChange,
        toggles,
        onToggle: handleToggle,
        fps: fpsTracker.getDisplayFps(),
        playerConfig: PLAYER_PROXY_CONFIG,
        onPlayerConfigChange: handlePlayerConfigChange,
        aiMode: world.aiMode,
        onAIModeChange: handleAIModeChange,
    });
}

// Game loop with FPS tracking (extracted to util/fpsTracker.js)
const fpsTracker = createFpsTracker();

function gameLoop(timestamp) {
    const deltaTime = fpsTracker.update(timestamp);
    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

// Reset timing when tab becomes visible again
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        fpsTracker.resetTiming();
    }
});

// Background waves spawn immediately and continuously
// Set waves only spawn during SET state (lulls are empty of set waves)

// Expose world state for E2E testing
window.world = world;
window.toggles = toggles;
window.AI_MODE = AI_MODE;
window.createAIState = createAIState;

requestAnimationFrame(gameLoop);

console.log('Wave Sets and Lulls visualization');
console.log('Background waves always present, set waves only during SET state');
