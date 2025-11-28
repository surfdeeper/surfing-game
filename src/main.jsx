// Surfing Game - Time-based wave model
// Wave position is derived from time, enabling deterministic tests
//
// Architecture:
// - Wave objects store spawnTime (immutable), not position
// - Position is calculated: progress = (currentTime - spawnTime) / travelDuration
// - Coordinates mapped: progress (0-1) → screen pixels at render time

import {
    createWave,
    getWaveProgress,
    WAVE_TYPE,
    WAVE_X_SAMPLES,
} from './state/waveModel.js';
import { DEFAULT_BATHYMETRY, getDepth } from './state/bathymetryModel.js';
import { progressToScreenY, getOceanBounds, calculateTravelDuration } from './render/coordinates.js';
import {
    DEFAULT_CONFIG,
    createInitialState,
} from './state/setLullModel.js';
import {
    BACKGROUND_CONFIG,
    createInitialBackgroundState,
} from './state/backgroundWaveModel.js';
import {
    updateWaveSpawning,
    updateWaves,
    depositFoam,
    updateFoamLifecycle,
    depositFoamRows,
    updateFoamRowLifecycle,
    updatePlayer,
} from './update/index.js';
import { EventType } from './state/eventStore.js';
import {
    loadSettings,
    toggleSetting,
    updateSetting,
    cycleSetting,
    getSettingForHotkey,
    SETTINGS_SCHEMA,
} from './state/settingsModel.js';
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
    createEnergyField,
    updateEnergyField,
    injectWavePulse,
    getHeightAt,
} from './state/energyFieldModel.js';
import { renderEnergyField } from './render/energyFieldRenderer.js';
import { KeyboardInput } from './input/keyboard.js';
import { createRoot } from 'react-dom/client';
import { DebugPanel } from './ui/DebugPanel.jsx';
import {
    buildIntensityGrid,
    boxBlur,
    extractLineSegments,
    buildIntensityGridOptionA,
    buildIntensityGridOptionB,
    buildIntensityGridOptionC,
} from './render/marchingSquares.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Bathymetry heat map cache (Plan 130)
// Built once on toggle/resize, then blitted each frame
let bathymetryCache = null;

// Make canvas fill the screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Invalidate bathymetry cache on resize
    bathymetryCache = null;
}
resize();
window.addEventListener('resize', resize);

// World settings
const world = {
    // Shore is at the bottom of the screen
    shoreHeight: 100,      // Height of shore strip at bottom

    // Swell parameters
    swellSpacing: 80,      // Visual spacing of wave gradient (pixels)
    swellSpeed: 50,        // Pixels per second toward shore (downward)

    // Unified wave array - all waves in one array with type property
    // Waves are rendered in spawn order (natural interleaving)
    waves: [],             // Array of { id, spawnTime, amplitude, type }
    gameTime: 0,           // Current game time in ms (for time-based positions)

    // Foam segments - independent whitewater entities (NOT attached to waves)
    // Spawned at break points, persist and fade independently
    foamSegments: [],      // Array of { id, spawnTime, x, y, width, opacity }

    // Foam rows - span-based representation for smooth rendering (Layer 1)
    // Each row represents contiguous breaking regions at a Y position
    foamRows: [],          // Array of { y, spawnTime, segments: [{startX, endX, intensity}, ...] }

    // Set/lull configuration (used by setLullModel)
    setConfig: DEFAULT_CONFIG,

    // Set/lull state machine (managed by setLullModel)
    setLullState: createInitialState(DEFAULT_CONFIG),

    // Background wave configuration and state
    backgroundConfig: BACKGROUND_CONFIG,
    backgroundState: createInitialBackgroundState(BACKGROUND_CONFIG),

    // Bathymetry (ocean floor depth map)
    bathymetry: DEFAULT_BATHYMETRY,

    // Player proxy (Plan 71) - initialized lazily after first resize
    playerProxy: null,

    // AI player state (Plan 16) - initialized lazily when AI toggle enabled
    aiState: null,
    aiMode: AI_MODE.INTERMEDIATE,  // Current AI mode
    lastAIInput: { left: false, right: false, up: false, down: false },

    // Energy field (Plan 140) - continuous wave model
    energyField: createEnergyField(),
};

// Keyboard input for player movement (arrow keys / WASD)
const keyboard = new KeyboardInput();

// Colors
const colors = {
    ocean: '#1a4a6e',
    shore: '#c2a86e',
    swellLine: '#4a90b8',
    grid: '#2a5a7e',
    // Type-specific wave palettes
    setWave: {
        peak: '#0d3a5c',      // Deep, rich blue at peaks
        trough: '#2e7aa8',    // Saturated trough - full contrast
    },
    backgroundWave: {
        peak: '#2a5a7e',      // Lighter, more muted peak
        trough: '#5a9ac0',    // Desaturated, subtle trough
    },
};

// Parse hex color to RGB components
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

// Convert RGB to hex
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

// Get wave colors based on type and amplitude
// Set waves: full contrast, rich colors
// Background waves: reduced contrast, muted colors
function getWaveColors(wave) {
    const isSet = wave.type === WAVE_TYPE.SET;
    const palette = isSet ? colors.setWave : colors.backgroundWave;

    // Set waves get full contrast; background waves max out at 60%
    const maxContrast = isSet ? 1.0 : 0.6;
    const contrast = wave.amplitude * maxContrast;

    const peak = hexToRgb(palette.peak);
    const trough = hexToRgb(palette.trough);

    // Lerp from peak toward trough based on contrast
    const r = peak.r + (trough.r - peak.r) * contrast;
    const g = peak.g + (trough.g - peak.g) * contrast;
    const b = peak.b + (trough.b - peak.b) * contrast;

    return {
        peak: palette.peak,
        trough: rgbToHex(r, g, b),
    };
}

// Settings loaded from settingsModel (schema-validated, versioned)
// This replaces the old inline localStorage reading
let settings = loadSettings();

// Alias for backwards compatibility - kept in sync with settings
let toggles = settings;

// Toggle handler for React UI - uses settingsModel for persistence
function handleToggle(key) {
    settings = toggleSetting(settings, key);
    toggles = settings;  // Keep alias in sync

    // Initialize player proxy when first enabled via UI
    if (key === 'showPlayer' && settings.showPlayer && !world.playerProxy) {
        const { shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
        world.playerProxy = createPlayerProxy(canvas.width, shoreY);
    }
}

// Time scale handler for React UI
function handleTimeScaleChange(newScale) {
    settings = updateSetting(settings, 'timeScale', newScale);
    toggles = settings;
}

// Player config handler for React UI
function handlePlayerConfigChange(key, value) {
    PLAYER_PROXY_CONFIG[key] = value;
}

// AI mode handler for React UI
function handleAIModeChange() {
    const modes = [AI_MODE.BEGINNER, AI_MODE.INTERMEDIATE, AI_MODE.EXPERT];
    const currentIdx = modes.indexOf(world.aiMode);
    world.aiMode = modes[(currentIdx + 1) % modes.length];
    world.aiState = createAIState(world.aiMode);
    console.log(`[AI] Switched to ${world.aiMode} mode`);
}

// Create UI container for React
const uiContainer = document.createElement('div');
uiContainer.id = 'ui-root';
document.body.appendChild(uiContainer);
const reactRoot = createRoot(uiContainer);

// Game state persistence - save waves, time, set/lull state
function saveGameState() {
    const state = {
        gameTime: world.gameTime,
        timeScale: settings.timeScale,
        waves: world.waves,
        foamSegments: world.foamSegments,
        setLullState: world.setLullState,
        backgroundState: world.backgroundState,
        playerProxy: world.playerProxy,
    };
    localStorage.setItem('gameState', JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem('gameState');
    if (!saved) return false;

    try {
        const state = JSON.parse(saved);
        world.gameTime = state.gameTime || 0;
        // Restore timeScale via settings model
        if (state.timeScale) {
            settings = updateSetting(settings, 'timeScale', state.timeScale);
            toggles = settings;
        }
        // Migrate waves to ensure they have progressPerX (added in wave refraction feature)
        world.waves = (state.waves || []).map(wave => ({
            ...wave,
            progressPerX: wave.progressPerX || new Array(WAVE_X_SAMPLES).fill(0),
            lastUpdateTime: wave.lastUpdateTime ?? wave.spawnTime,
        }));
        world.foamSegments = state.foamSegments || [];
        if (state.setLullState) {
            // Validate timestamps aren't corrupted (stale data from previous session)
            const sls = state.setLullState;
            const timeSinceLastWave = (world.gameTime - sls.lastWaveSpawnTime) / 1000;
            const elapsedInState = (world.gameTime - sls.stateStartTime) / 1000;

            // If timers are negative or absurdly large, reset state
            if (timeSinceLastWave < 0 || timeSinceLastWave > 300 ||
                elapsedInState < 0 || elapsedInState > 300) {
                console.warn('Stale setLullState detected, reinitializing');
                world.setLullState = createInitialState(DEFAULT_CONFIG, Math.random, world.gameTime);
            } else {
                world.setLullState = sls;
            }
        }
        if (state.backgroundState) world.backgroundState = state.backgroundState;
        if (state.playerProxy) world.playerProxy = state.playerProxy;
        return true;
    } catch (e) {
        console.warn('Failed to load game state:', e);
        return false;
    }
}

// Load saved state on startup
loadGameState();

// Initialize player proxy if it was enabled in a previous session
if (toggles.showPlayer && !world.playerProxy) {
    const { shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
    world.playerProxy = createPlayerProxy(canvas.width, shoreY);
}

// Keyboard controls - uses settingsModel for hotkey mapping
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Special case: 't' cycles timeScale
    if (key === 't') {
        settings = cycleSetting(settings, 'timeScale');
        toggles = settings;
        return;
    }

    // Special case: 'm' cycles AI mode (not in settings)
    if (key === 'm') {
        if (settings.showPlayer && settings.showAIPlayer) {
            const modes = [AI_MODE.BEGINNER, AI_MODE.INTERMEDIATE, AI_MODE.EXPERT];
            const currentIdx = modes.indexOf(world.aiMode);
            world.aiMode = modes[(currentIdx + 1) % modes.length];
            world.aiState = createAIState(world.aiMode);
            console.log(`[AI] Switched to ${world.aiMode} mode`);
        }
        return;
    }

    // Special case: 'a' only toggles AI if player is enabled
    if (key === 'a') {
        if (settings.showPlayer) {
            handleToggle('showAIPlayer');
        }
        return;
    }

    // General case: look up setting by hotkey from schema
    const settingKey = getSettingForHotkey(key);
    if (settingKey && SETTINGS_SCHEMA[settingKey]?.type === 'boolean') {
        handleToggle(settingKey);
    }
});

// Spawn a wave at the horizon with the given amplitude and type
function spawnWave(amplitude, type) {
    world.waves.push(createWave(world.gameTime, amplitude, type));

    // Inject pulse into energy field to match discrete wave
    // Set waves have more energy (2x) than background waves
    if (toggles.showEnergyField) {
        const energyMultiplier = type === WAVE_TYPE.SET ? 2.0 : 1.0;
        injectWavePulse(world.energyField, amplitude * energyMultiplier);
    }
}

function update(deltaTime) {
    // Apply time scale for testing
    const scaledDelta = deltaTime * settings.timeScale;

    // Advance game time (in ms)
    world.gameTime += scaledDelta * 1000;

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

    // Apply state updates
    world.setLullState = spawnResult.setLullState;
    world.backgroundState = spawnResult.backgroundState;

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
    world.waves = updateWaves(
        world.waves,
        world.gameTime,
        travelDuration,
        bufferDuration,
        world.bathymetry
    );

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
    world.foamSegments = depositFoam(world.waves, world.foamSegments, foamState);

    // Update foam lifecycle (fade and remove)
    world.foamSegments = updateFoamLifecycle(world.foamSegments, scaledDelta, world.gameTime);

    // Deposit foam rows (span-based) via orchestrator
    world.foamRows = depositFoamRows(world.waves, world.foamRows, foamState);

    // Update foam row lifecycle (fade and remove)
    world.foamRows = updateFoamRowLifecycle(world.foamRows, world.gameTime);

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

        world.playerProxy = playerResult.playerProxy;
        world.aiState = playerResult.aiState;
        world.lastAIInput = playerResult.lastAIInput;
    }

    // Save game state periodically (every ~1 second)
    if (Math.floor(world.gameTime / 1000) !== Math.floor((world.gameTime - scaledDelta * 1000) / 1000)) {
        saveGameState();
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
    // NOTE: This is STATIC - the ocean floor doesn't move. The blue waves
    // animate on top of this, which can be visually confusing at first.
    // Performance: Cached to offscreen canvas, rebuilt only on toggle/resize (Plan 130)
    if (toggles.showBathymetry) {
        // Build cache if needed
        if (!bathymetryCache || bathymetryCache.width !== w || bathymetryCache.height !== oceanBottom) {
            bathymetryCache = document.createElement('canvas');
            bathymetryCache.width = w;
            bathymetryCache.height = oceanBottom;
            const cacheCtx = bathymetryCache.getContext('2d');

            const stepX = 4;
            const stepY = 4;
            const colorScaleDepth = 15;

            for (let y = oceanTop; y < oceanBottom; y += stepY) {
                const progress = (y - oceanTop) / (oceanBottom - oceanTop);
                for (let x = 0; x < w; x += stepX) {
                    const normalizedX = x / w;
                    const depth = getDepth(normalizedX, world.bathymetry, progress);
                    const depthRatio = Math.min(1, Math.sqrt(depth / colorScaleDepth));
                    const r = Math.floor(220 - 160 * depthRatio);
                    const g = Math.floor(180 - 140 * depthRatio);
                    const b = Math.floor(100 - 80 * depthRatio);
                    cacheCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    cacheCtx.fillRect(x, y, stepX, stepY);
                }
            }
        }

        // Blit cached image
        ctx.drawImage(bathymetryCache, 0, 0);
    }

    // Draw energy field (Plan 140) - toggle with 'E' key
    // Renders as an alternative to discrete waves when enabled
    if (toggles.showEnergyField) {
        renderEnergyField(ctx, world.energyField, oceanTop, oceanBottom, w);
    }

    // Draw shore (bottom strip)
    ctx.fillStyle = colors.shore;
    ctx.fillRect(0, shoreY, w, world.shoreHeight);

    // Helper function to draw a wave as a bent gradient band
    // Uses per-X progress data for refraction (bending based on bathymetry)
    // When energy field is enabled, wave thickness scales with local energy (Plan 141 Phase 4)
    const drawWave = (wave) => {
        const isSet = wave.type === WAVE_TYPE.SET;

        // Type-specific thickness ranges
        // Set waves: 40-120px (prominent)
        // Background waves: 25-60px (subtle)
        const minThickness = isSet ? 40 : 25;
        const maxThickness = isSet ? 120 : 60;

        // Get type-specific colors
        const waveColors = getWaveColors(wave);

        // Set alpha: bathymetry override, then type-based
        // Background waves slightly transparent (85%) for subtlety
        const baseAlpha = isSet ? 1.0 : 0.85;
        ctx.globalAlpha = toggles.showBathymetry ? 0.7 : baseAlpha;

        // Draw wave as vertical slices, each at its own Y position based on per-X progress
        const numSlices = wave.progressPerX ? wave.progressPerX.length : WAVE_X_SAMPLES;
        const sliceWidth = w / numSlices;

        for (let i = 0; i < numSlices; i++) {
            const normalizedX = (i + 0.5) / numSlices;
            const progress = wave.progressPerX ? wave.progressPerX[i] : getWaveProgress(wave, world.gameTime, travelDuration);
            const peakY = progressToScreenY(progress, oceanTop, oceanBottom);

            // Calculate thickness for this slice
            // When energy field is enabled, scale by local energy (Plan 141 Phase 4)
            let thicknessMultiplier = wave.amplitude;
            if (toggles.showEnergyField) {
                const energyAtSlice = getHeightAt(world.energyField, normalizedX, progress);
                // TEMP: EXTREMELY exaggerated for testing - wave nearly disappears without energy
                // energyAtSlice is typically 0-1, we want 0 energy = 0.01 thickness, full energy = full thickness
                thicknessMultiplier = 0.01 + energyAtSlice * 0.99;
            }

            const waveSpacing = minThickness + (maxThickness - minThickness) * thicknessMultiplier;
            const halfSpacing = waveSpacing / 2;
            const troughY = peakY + halfSpacing;
            const nextPeakY = peakY + waveSpacing;

            const sliceX = i * sliceWidth;

            // First half: peak (dark) to trough (light)
            if (troughY > 0 && peakY < shoreY) {
                const grad1 = ctx.createLinearGradient(0, peakY, 0, troughY);
                grad1.addColorStop(0, waveColors.peak);
                grad1.addColorStop(1, waveColors.trough);
                ctx.fillStyle = grad1;
                ctx.fillRect(sliceX, Math.max(0, peakY), sliceWidth + 1, Math.min(troughY, shoreY) - Math.max(0, peakY));
            }

            // Second half: trough (light) to next peak (dark)
            if (nextPeakY > 0 && troughY < shoreY) {
                const grad2 = ctx.createLinearGradient(0, troughY, 0, nextPeakY);
                grad2.addColorStop(0, waveColors.trough);
                grad2.addColorStop(1, waveColors.peak);
                ctx.fillStyle = grad2;
                ctx.fillRect(sliceX, Math.max(0, troughY), sliceWidth + 1, Math.min(nextPeakY, shoreY) - Math.max(0, troughY));
            }
        }
    };

    // Draw all waves in spawn order (natural interleaving, no artificial layering)
    // Sort by progress so waves closer to horizon render first (painter's algorithm)
    const sortedWaves = [...world.waves].sort((a, b) => {
        const progressA = getWaveProgress(a, world.gameTime, travelDuration);
        const progressB = getWaveProgress(b, world.gameTime, travelDuration);
        return progressA - progressB;
    });

    // Draw waves based on visibility toggles
    // Note: waves still exist and simulate even when hidden
    for (const wave of sortedWaves) {
        const isSetWave = wave.type === WAVE_TYPE.SET;
        const isVisible = isSetWave ? toggles.showSetWaves : toggles.showBackgroundWaves;
        if (isVisible) {
            drawWave(wave);
        }
    }
    ctx.globalAlpha = 1.0; // Reset alpha after waves

    // LAYER 1: Foam contours using marching squares
    // Builds an intensity grid, applies blur, then extracts contour lines
    if (toggles.showFoamZones) {
        const GRID_W = 80;
        const GRID_H = 60;

        // Build intensity grid from foam rows
        const grid = buildIntensityGrid(world.foamRows, GRID_W, GRID_H, w, oceanBottom);

        // Apply blur to smooth the data
        const blurred = boxBlur(grid, GRID_W, GRID_H, 2);

        // Define threshold layers (outer to inner)
        const thresholds = [
            { value: 0.15, color: 'rgba(255, 255, 255, 0.3)', lineWidth: 1 },
            { value: 0.3, color: 'rgba(255, 255, 255, 0.6)', lineWidth: 2 },
            { value: 0.5, color: 'rgba(255, 255, 255, 0.9)', lineWidth: 3 },
        ];

        // Draw contours for each threshold
        for (const { value, color, lineWidth } of thresholds) {
            const segments = extractLineSegments(blurred, GRID_W, GRID_H, value);

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            for (const seg of segments) {
                const x1 = seg.x1 * w;
                const y1 = seg.y1 * oceanBottom;
                const x2 = seg.x2 * w;
                const y2 = seg.y2 * oceanBottom;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.stroke();
        }
    }

    // LAYER: Option A - Expanding segment bounds (red/orange contours)
    // Outer contours expand as foam ages, inner contours collapse
    if (toggles.showFoamOptionA) {
        const GRID_W = 80;
        const GRID_H = 60;
        const grid = buildIntensityGridOptionA(world.foamRows, GRID_W, GRID_H, w, oceanBottom, world.gameTime);
        const blurred = boxBlur(grid, GRID_W, GRID_H, 2);

        const thresholds = [
            { value: 0.15, color: 'rgba(255, 100, 100, 0.4)', lineWidth: 1 },
            { value: 0.3, color: 'rgba(255, 150, 100, 0.7)', lineWidth: 2 },
            { value: 0.5, color: 'rgba(255, 200, 150, 0.9)', lineWidth: 3 },
        ];

        for (const { value, color, lineWidth } of thresholds) {
            const segments = extractLineSegments(blurred, GRID_W, GRID_H, value);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (const seg of segments) {
                ctx.moveTo(seg.x1 * w, seg.y1 * oceanBottom);
                ctx.lineTo(seg.x2 * w, seg.y2 * oceanBottom);
            }
            ctx.stroke();
        }
    }

    // LAYER: Option B - Age-based blur (green contours)
    // More blur passes as foam ages, causing natural expansion
    if (toggles.showFoamOptionB) {
        const GRID_W = 80;
        const GRID_H = 60;
        const { grid, blurPasses } = buildIntensityGridOptionB(world.foamRows, GRID_W, GRID_H, w, oceanBottom, world.gameTime);
        const blurred = boxBlur(grid, GRID_W, GRID_H, blurPasses);

        const thresholds = [
            { value: 0.15, color: 'rgba(100, 255, 100, 0.4)', lineWidth: 1 },
            { value: 0.3, color: 'rgba(150, 255, 150, 0.7)', lineWidth: 2 },
            { value: 0.5, color: 'rgba(200, 255, 200, 0.9)', lineWidth: 3 },
        ];

        for (const { value, color, lineWidth } of thresholds) {
            const segments = extractLineSegments(blurred, GRID_W, GRID_H, value);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (const seg of segments) {
                ctx.moveTo(seg.x1 * w, seg.y1 * oceanBottom);
                ctx.lineTo(seg.x2 * w, seg.y2 * oceanBottom);
            }
            ctx.stroke();
        }
    }

    // LAYER: Option C - Per-row dispersion radius (blue/purple contours)
    // Most physically accurate - foam spreads in X and Y, core/halo fade separately
    if (toggles.showFoamOptionC) {
        const GRID_W = 80;
        const GRID_H = 60;
        const grid = buildIntensityGridOptionC(world.foamRows, GRID_W, GRID_H, w, oceanBottom, world.gameTime);
        const blurred = boxBlur(grid, GRID_W, GRID_H, 2);

        const thresholds = [
            { value: 0.15, color: 'rgba(150, 100, 255, 0.4)', lineWidth: 1 },
            { value: 0.3, color: 'rgba(180, 150, 255, 0.7)', lineWidth: 2 },
            { value: 0.5, color: 'rgba(220, 200, 255, 0.9)', lineWidth: 3 },
        ];

        for (const { value, color, lineWidth } of thresholds) {
            const segments = extractLineSegments(blurred, GRID_W, GRID_H, value);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (const seg of segments) {
                ctx.moveTo(seg.x1 * w, seg.y1 * oceanBottom);
                ctx.lineTo(seg.x2 * w, seg.y2 * oceanBottom);
            }
            ctx.stroke();
        }
    }

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

    // Prepare display data for Preact debug panel
    const displayWaves = world.waves
        .map(wave => ({
            wave,
            progress: getWaveProgress(wave, world.gameTime, travelDuration),
            travelDuration
        }))
        .filter(({ progress }) => progress < 1)
        .sort((a, b) => a.progress - b.progress);

    // Render React debug panel (called every frame via requestAnimationFrame)
    reactRoot.render(
        <DebugPanel
            setLullState={world.setLullState}
            gameTime={world.gameTime}
            displayWaves={displayWaves}
            foamCount={world.foamSegments.length}
            timeScale={settings.timeScale}
            onTimeScaleChange={handleTimeScaleChange}
            toggles={toggles}
            onToggle={handleToggle}
            fps={displayFps}
            playerConfig={PLAYER_PROXY_CONFIG}
            onPlayerConfigChange={handlePlayerConfigChange}
            aiMode={world.aiMode}
            onAIModeChange={handleAIModeChange}
        />
    );
}

// Game loop
const MAX_DELTA_TIME = 0.1;  // 100ms max - prevents huge jumps after tab restore
let lastTime = 0;

// FPS tracking with smoothing and "bad FPS hold" behavior
let displayFps = 60;
let smoothFps = 60;
let badFpsHoldUntil = 0;  // Timestamp until which to display the bad FPS value

function gameLoop(timestamp) {
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Clamp deltaTime to prevent huge jumps when returning from background
    if (deltaTime > MAX_DELTA_TIME) {
        deltaTime = MAX_DELTA_TIME;
    }

    // Calculate instantaneous FPS and smooth it
    const instantFps = deltaTime > 0 ? 1 / deltaTime : 60;
    smoothFps = smoothFps * 0.95 + instantFps * 0.05;  // Exponential moving average

    // If FPS drops below 30, hold that value for 2 seconds
    if (smoothFps < 30) {
        displayFps = smoothFps;
        badFpsHoldUntil = timestamp + 2000;
    } else if (timestamp < badFpsHoldUntil) {
        // Keep showing the bad FPS value during hold period
        // (displayFps stays unchanged)
    } else {
        displayFps = smoothFps;
    }

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Reset timing when tab becomes visible again
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        lastTime = performance.now();
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
