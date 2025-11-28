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
    getActiveWaves,
    WAVE_TYPE,
    isWaveBreaking,
    isWaveBreakingWithEnergy,
    updateWaveRefraction,
    WAVE_X_SAMPLES,
} from './state/waveModel.js';
import { createFoam, updateFoam, getActiveFoam } from './state/foamModel.js';
import { DEFAULT_BATHYMETRY, getDepth } from './state/bathymetryModel.js';
import { progressToScreenY, screenYToProgress, getOceanBounds, calculateTravelDuration } from './render/coordinates.js';
import {
    DEFAULT_CONFIG,
    createInitialState,
    updateSetLullState,
} from './state/setLullModel.js';
import {
    BACKGROUND_CONFIG,
    createInitialBackgroundState,
    updateBackgroundWaveState,
} from './state/backgroundWaveModel.js';
import {
    PLAYER_PROXY_CONFIG,
    createPlayerProxy,
    updatePlayerProxy,
    drawPlayerProxy,
    sampleFoamIntensity,
} from './state/playerProxyModel.js';
import {
    createAIState,
    updateAIPlayer,
    drawAIKeyIndicator,
    AI_MODE,
} from './state/aiPlayerModel.js';
import {
    createEnergyField,
    updateEnergyField,
    injectWavePulse,
    drainEnergyAt,
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

// Time scale for testing (1x, 2x, 4x, 8x)
let timeScale = 1;
const TIME_SCALES = [1, 2, 4, 8];

// Debug view modes (toggles affect visibility only, not simulation)
// Load from localStorage or use defaults
const toggles = {
    showBathymetry: localStorage.getItem('showBathymetry') === 'true',
    showSetWaves: localStorage.getItem('showSetWaves') !== 'false',  // default true
    showBackgroundWaves: localStorage.getItem('showBackgroundWaves') !== 'false',  // default true
    showFoamZones: localStorage.getItem('showFoamZones') !== 'false',  // default true - smooth foam polygons
    showFoamSamples: localStorage.getItem('showFoamSamples') === 'true',  // default false - debug rectangles
    showPlayer: localStorage.getItem('showPlayer') === 'true',  // default false - player proxy
    showAIPlayer: localStorage.getItem('showAIPlayer') === 'true',  // default false - AI controlled player
    // Foam dispersion experimental options (compare different algorithms)
    showFoamOptionA: localStorage.getItem('showFoamOptionA') === 'true',  // Expand bounds
    showFoamOptionB: localStorage.getItem('showFoamOptionB') === 'true',  // Age-based blur
    showFoamOptionC: localStorage.getItem('showFoamOptionC') === 'true',  // Per-row dispersion
    // Energy field (Plan 140) - continuous wave model
    showEnergyField: localStorage.getItem('showEnergyField') === 'true',
};

// Helper to save toggle state
function saveToggleState() {
    localStorage.setItem('showBathymetry', toggles.showBathymetry);
    localStorage.setItem('showSetWaves', toggles.showSetWaves);
    localStorage.setItem('showBackgroundWaves', toggles.showBackgroundWaves);
    localStorage.setItem('showFoamZones', toggles.showFoamZones);
    localStorage.setItem('showFoamSamples', toggles.showFoamSamples);
    localStorage.setItem('showPlayer', toggles.showPlayer);
    localStorage.setItem('showAIPlayer', toggles.showAIPlayer);
    localStorage.setItem('showFoamOptionA', toggles.showFoamOptionA);
    localStorage.setItem('showFoamOptionB', toggles.showFoamOptionB);
    localStorage.setItem('showFoamOptionC', toggles.showFoamOptionC);
    localStorage.setItem('showEnergyField', toggles.showEnergyField);
}

// Toggle handler for Preact UI
function handleToggle(key) {
    toggles[key] = !toggles[key];
    saveToggleState();

    // Initialize player proxy when first enabled via UI
    if (key === 'showPlayer' && toggles.showPlayer && !world.playerProxy) {
        const { shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
        world.playerProxy = createPlayerProxy(canvas.width, shoreY);
    }
}

// Time scale handler for React UI
function handleTimeScaleChange(newScale) {
    timeScale = newScale;
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
        timeScale,
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
        timeScale = state.timeScale || 1;
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

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
        const currentIndex = TIME_SCALES.indexOf(timeScale);
        const nextIndex = (currentIndex + 1) % TIME_SCALES.length;
        timeScale = TIME_SCALES[nextIndex];
    }
    if (e.key === 'b' || e.key === 'B') {
        handleToggle('showBathymetry');
    }
    if (e.key === 's' || e.key === 'S') {
        handleToggle('showSetWaves');
    }
    if (e.key === 'g' || e.key === 'G') {
        handleToggle('showBackgroundWaves');
    }
    if (e.key === 'f' || e.key === 'F') {
        handleToggle('showFoamZones');
    }
    if (e.key === 'd' || e.key === 'D') {
        handleToggle('showFoamSamples');
    }
    if (e.key === 'p' || e.key === 'P') {
        handleToggle('showPlayer');
        // Initialize player proxy when first enabled
        if (toggles.showPlayer && !world.playerProxy) {
            const { shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
            world.playerProxy = createPlayerProxy(canvas.width, shoreY);
        }
    }
    if (e.key === 'a' || e.key === 'A') {
        // AI Player toggle only works if Player is enabled
        if (toggles.showPlayer) {
            handleToggle('showAIPlayer');
        }
    }
    if (e.key === 'm' || e.key === 'M') {
        // Cycle AI mode: BEGINNER -> INTERMEDIATE -> EXPERT -> BEGINNER
        if (toggles.showPlayer && toggles.showAIPlayer) {
            const modes = [AI_MODE.BEGINNER, AI_MODE.INTERMEDIATE, AI_MODE.EXPERT];
            const currentIdx = modes.indexOf(world.aiMode);
            world.aiMode = modes[(currentIdx + 1) % modes.length];
            world.aiState = createAIState(world.aiMode);
            console.log(`[AI] Switched to ${world.aiMode} mode`);
        }
    }
    // Foam dispersion option toggles (1, 2, 3 keys)
    if (e.key === '1') {
        handleToggle('showFoamOptionA');
    }
    if (e.key === '2') {
        handleToggle('showFoamOptionB');
    }
    if (e.key === '3') {
        handleToggle('showFoamOptionC');
    }
    // Energy field toggle (E key)
    if (e.key === 'e' || e.key === 'E') {
        handleToggle('showEnergyField');
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
    const scaledDelta = deltaTime * timeScale;

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

    // Update set/lull state machine (handles set waves only)
    // Pass absolute gameTime instead of deltaTime
    const setResult = updateSetLullState(
        world.setLullState,
        world.gameTime,
        world.setConfig
    );
    world.setLullState = setResult.state;

    // Spawn set wave if the state machine says to
    if (setResult.shouldSpawn) {
        spawnWave(setResult.amplitude, WAVE_TYPE.SET);
    }

    // Update background wave state (always spawning, independent of set/lull)
    const bgResult = updateBackgroundWaveState(
        world.backgroundState,
        scaledDelta,
        world.backgroundConfig
    );
    world.backgroundState = bgResult.state;

    // Spawn background wave if needed
    if (bgResult.shouldSpawn) {
        spawnWave(bgResult.amplitude, WAVE_TYPE.BACKGROUND);
    }

    // Remove waves that have completed their journey (time-based)
    const { oceanTop, oceanBottom } = getOceanBounds(canvas.height, world.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);
    // Add buffer for visual spacing past shore
    const bufferDuration = (world.swellSpacing / world.swellSpeed) * 1000;
    world.waves = getActiveWaves(world.waves, world.gameTime - bufferDuration, travelDuration);

    // Update wave refraction (per-X progress based on bathymetry)
    // Waves slow down in shallow water, causing them to bend
    const getDepthForRefraction = (normalizedX, progress) =>
        getDepth(normalizedX, world.bathymetry, progress);

    for (const wave of world.waves) {
        updateWaveRefraction(
            wave,
            world.gameTime,
            travelDuration,
            getDepthForRefraction,
            world.bathymetry.deepDepth
        );
    }

    // Deposit foam where waves are breaking
    // Foam is deposited at the wave's current position and stays there (doesn't move)
    // Shape of foam naturally follows bathymetry because it's deposited wherever depth triggers breaking
    const numXSamples = 80;  // Higher resolution for smoother contours
    const foamYSpacing = 3;  // Y spacing between foam deposits (pixels)

    for (const wave of world.waves) {
        const progress = getWaveProgress(wave, world.gameTime, travelDuration);
        const waveY = progressToScreenY(progress, oceanTop, oceanBottom);

        // Skip if wave hasn't moved enough since last deposit
        if (wave.lastFoamY >= 0 && Math.abs(waveY - wave.lastFoamY) < foamYSpacing) {
            continue;
        }

        // Calculate how many foam rows to deposit (fill in skipped positions at high time scales)
        const startY = wave.lastFoamY >= 0 ? wave.lastFoamY : waveY;
        const yDelta = waveY - startY;
        const direction = Math.sign(yDelta);
        const numRows = Math.max(1, Math.floor(Math.abs(yDelta) / foamYSpacing));

        for (let row = 0; row < numRows; row++) {
            // Interpolate Y position for this foam row
            const foamY = startY + direction * (row + 1) * foamYSpacing;
            // Interpolate progress for this Y position to get correct depth sampling
            const foamProgress = screenYToProgress(foamY, oceanTop, oceanBottom);

            let depositedAny = false;
            for (let i = 0; i < numXSamples; i++) {
                const normalizedX = (i + 0.5) / numXSamples;
                const depth = getDepth(normalizedX, world.bathymetry, foamProgress);

                // Check breaking condition - use energy-aware check when energy field is enabled
                let shouldBreak;
                let energyAtPoint = 0;
                if (toggles.showEnergyField) {
                    energyAtPoint = getHeightAt(world.energyField, normalizedX, foamProgress);
                    shouldBreak = isWaveBreakingWithEnergy(wave, depth, energyAtPoint);
                } else {
                    shouldBreak = isWaveBreaking(wave, depth);
                }

                if (shouldBreak) {
                    // Drain energy where foam is deposited (wave breaks = energy loss)
                    let energyReleased = wave.amplitude; // Default for non-energy mode
                    if (toggles.showEnergyField) {
                        // TEMP: EXTREME drain for testing - drain 20x wave amplitude to nearly empty energy
                        energyReleased = drainEnergyAt(world.energyField, normalizedX, foamProgress, wave.amplitude * 20.0);
                    }

                    // Deposit foam at this location - it stays here!
                    // Foam opacity scales with energy released (Plan 141 Phase 3)
                    const foam = createFoam(world.gameTime, normalizedX, foamY, wave.id);
                    foam.opacity = Math.min(1.0, energyReleased * 2);
                    world.foamSegments.push(foam);
                    depositedAny = true;
                }
            }

            if (depositedAny) {
                wave.lastFoamY = foamY;
            }
        }
    }

    // Update existing foam (just fades, doesn't move)
    for (const foam of world.foamSegments) {
        updateFoam(foam, scaledDelta, world.gameTime);
    }

    // Remove faded foam
    world.foamSegments = getActiveFoam(world.foamSegments);

    // Deposit foam rows (span-based) for smooth rendering - NEW LAYER
    // This runs in parallel to the point-based system above
    for (const wave of world.waves) {
        const progress = getWaveProgress(wave, world.gameTime, travelDuration);
        const waveY = progressToScreenY(progress, oceanTop, oceanBottom);

        // Skip if wave hasn't moved enough since last row deposit
        if (wave.lastFoamRowY >= 0 && Math.abs(waveY - wave.lastFoamRowY) < foamYSpacing) {
            continue;
        }

        // Calculate how many foam rows to deposit
        const startY = wave.lastFoamRowY >= 0 ? wave.lastFoamRowY : waveY;
        const yDelta = waveY - startY;
        const direction = Math.sign(yDelta);
        const numRowsToDeposit = Math.max(1, Math.floor(Math.abs(yDelta) / foamYSpacing));

        for (let rowIdx = 0; rowIdx < numRowsToDeposit; rowIdx++) {
            const foamY = startY + direction * (rowIdx + 1) * foamYSpacing;
            const foamProgress = screenYToProgress(foamY, oceanTop, oceanBottom);

            // Scan across X to find contiguous breaking regions (spans)
            const segments = [];
            let spanStart = null;
            let spanIntensitySum = 0;
            let spanSampleCount = 0;

            for (let i = 0; i <= numXSamples; i++) {
                const normalizedX = (i + 0.5) / numXSamples;
                const depth = i < numXSamples ? getDepth(normalizedX, world.bathymetry, foamProgress) : Infinity;
                const isBreaking = i < numXSamples && isWaveBreaking(wave, depth);

                if (isBreaking) {
                    if (spanStart === null) {
                        spanStart = normalizedX;
                        spanIntensitySum = 0;
                        spanSampleCount = 0;
                    }
                    // Calculate intensity based on how shallow (more shallow = more intense)
                    // Breaking threshold is around 1.5-2m depth, so intensity scales from 0 to 1
                    const intensity = Math.max(0, Math.min(1, 1 - depth / 3));
                    spanIntensitySum += intensity;
                    spanSampleCount++;
                } else if (spanStart !== null) {
                    // End of a breaking span
                    const avgIntensity = spanSampleCount > 0 ? spanIntensitySum / spanSampleCount : 0.5;
                    segments.push({
                        startX: spanStart,
                        endX: (i - 0.5) / numXSamples,
                        intensity: avgIntensity
                    });
                    spanStart = null;
                }
            }

            if (segments.length > 0) {
                world.foamRows.push({
                    y: foamY,
                    spawnTime: world.gameTime,
                    segments
                });
                wave.lastFoamRowY = foamY;
            }
        }
    }

    // Update and remove faded foam rows
    const foamRowFadeTime = 4000; // 4 seconds in ms
    world.foamRows = world.foamRows.filter(row => {
        const age = world.gameTime - row.spawnTime;
        row.opacity = Math.max(0, 1 - age / foamRowFadeTime);
        return row.opacity > 0;
    });

    // Update player proxy if enabled
    if (toggles.showPlayer && world.playerProxy) {
        const { oceanTop, oceanBottom: ob, shoreY: sy } = getOceanBounds(canvas.height, world.shoreHeight);
        const td = calculateTravelDuration(ob, world.swellSpeed);

        // Determine input source: AI or keyboard
        let input;
        if (toggles.showAIPlayer) {
            // Initialize AI state if needed
            if (!world.aiState) {
                world.aiState = createAIState(world.aiMode);
            }
            // Get AI decision
            input = updateAIPlayer(
                world.playerProxy,
                world.aiState,
                world,
                scaledDelta,
                canvas.width,
                canvas.height,
                oceanTop,
                ob,
                td
            );
            world.lastAIInput = input;
        } else {
            input = keyboard.getKeys();
            world.lastAIInput = { left: false, right: false, up: false, down: false };
        }

        world.playerProxy = updatePlayerProxy(
            world.playerProxy,
            scaledDelta,
            input,
            world.foamRows,
            sy,
            canvas.width,
            canvas.height,
            PLAYER_PROXY_CONFIG
        );
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
            timeScale={timeScale}
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
