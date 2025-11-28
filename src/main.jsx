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
} from './state/waveModel.js';
import { createFoam, updateFoam, getActiveFoam } from './state/foamModel.js';
import { DEFAULT_BATHYMETRY, getDepth, getPeakX } from './state/bathymetryModel.js';
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

// Make canvas fill the screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
};

// Keyboard input for player movement (arrow keys / WASD)
const keyboard = new KeyboardInput();

// Colors
const colors = {
    ocean: '#1a4a6e',
    shore: '#c2a86e',
    swellLine: '#4a90b8',
    grid: '#2a5a7e',
    // Gradient swell colors
    swellPeak: '#1a4a6e',    // Dark blue at wave peaks (crests)
    swellTrough: '#4a90b8',  // Lighter blue at wave troughs (valleys)
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

// Lerp between two colors based on amplitude
// At low amplitude, trough color approaches peak color (less contrast)
function getTroughColor(amplitude) {
    const peak = hexToRgb(colors.swellPeak);
    const trough = hexToRgb(colors.swellTrough);

    // Linear scaling - direct amplitude to contrast mapping
    // Ensures all waves are clearly visible
    const r = peak.r + (trough.r - peak.r) * amplitude;
    const g = peak.g + (trough.g - peak.g) * amplitude;
    const b = peak.b + (trough.b - peak.b) * amplitude;

    return rgbToHex(r, g, b);
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
    // Foam dispersion experimental options (compare different algorithms)
    showFoamOptionA: localStorage.getItem('showFoamOptionA') === 'true',  // Expand bounds
    showFoamOptionB: localStorage.getItem('showFoamOptionB') === 'true',  // Age-based blur
    showFoamOptionC: localStorage.getItem('showFoamOptionC') === 'true',  // Per-row dispersion
};

// Helper to save toggle state
function saveToggleState() {
    localStorage.setItem('showBathymetry', toggles.showBathymetry);
    localStorage.setItem('showSetWaves', toggles.showSetWaves);
    localStorage.setItem('showBackgroundWaves', toggles.showBackgroundWaves);
    localStorage.setItem('showFoamZones', toggles.showFoamZones);
    localStorage.setItem('showFoamSamples', toggles.showFoamSamples);
    localStorage.setItem('showPlayer', toggles.showPlayer);
    localStorage.setItem('showFoamOptionA', toggles.showFoamOptionA);
    localStorage.setItem('showFoamOptionB', toggles.showFoamOptionB);
    localStorage.setItem('showFoamOptionC', toggles.showFoamOptionC);
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
        world.waves = state.waves || [];
        world.foamSegments = state.foamSegments || [];
        if (state.setLullState) world.setLullState = state.setLullState;
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
});

// Spawn a wave at the horizon with the given amplitude and type
function spawnWave(amplitude, type) {
    world.waves.push(createWave(world.gameTime, amplitude, type));
}

function update(deltaTime) {
    // Apply time scale for testing
    const scaledDelta = deltaTime * timeScale;

    // Advance game time (in ms)
    world.gameTime += scaledDelta * 1000;

    // Update set/lull state machine (handles set waves only)
    const setResult = updateSetLullState(
        world.setLullState,
        scaledDelta,
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
    const { oceanTop, oceanBottom, shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, world.swellSpeed);
    // Add buffer for visual spacing past shore
    const bufferDuration = (world.swellSpacing / world.swellSpeed) * 1000;
    world.waves = getActiveWaves(world.waves, world.gameTime - bufferDuration, travelDuration);

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

                if (isWaveBreaking(wave, depth)) {
                    // Deposit foam at this location - it stays here!
                    const foam = createFoam(world.gameTime, normalizedX, foamY, wave.id);
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
        const { shoreY } = getOceanBounds(canvas.height, world.shoreHeight);
        world.playerProxy = updatePlayerProxy(
            world.playerProxy,
            scaledDelta,
            keyboard.getKeys(),
            world.foamRows,
            shoreY,
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
    if (toggles.showBathymetry) {
        const stepX = 4;
        const stepY = 4;
        // Use a reference depth for color scaling (not deepDepth which is very deep)
        const colorScaleDepth = 15; // meters - depths beyond this are all "deep" colored
        for (let y = oceanTop; y < oceanBottom; y += stepY) {
            // progress: 0 at horizon (top), 1 at shore (bottom)
            const progress = (y - oceanTop) / (oceanBottom - oceanTop);
            for (let x = 0; x < w; x += stepX) {
                const normalizedX = x / w;
                const depth = getDepth(normalizedX, world.bathymetry, progress);
                // Use sqrt for non-linear scaling - shows shallow areas more distinctly
                const depthRatio = Math.min(1, Math.sqrt(depth / colorScaleDepth));
                // Sand/tan for shallow (depthRatio near 0), dark brown for deep (depthRatio near 1)
                const r = Math.floor(220 - 160 * depthRatio);  // 220 -> 60
                const g = Math.floor(180 - 140 * depthRatio);  // 180 -> 40
                const b = Math.floor(100 - 80 * depthRatio);   // 100 -> 20
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(x, y, stepX, stepY);
            }
        }
    }

    // Draw shore (bottom strip)
    ctx.fillStyle = colors.shore;
    ctx.fillRect(0, shoreY, w, world.shoreHeight);

    // Helper function to draw a wave as a gradient band
    const drawWave = (wave) => {
        // Scale thickness based on amplitude
        // Low amplitude (0.15) → thin band (40px)
        // High amplitude (1.0) → thick band (120px)
        const minThickness = 40;
        const maxThickness = 120;
        const waveSpacing = minThickness + (maxThickness - minThickness) * wave.amplitude;
        const halfSpacing = waveSpacing / 2;

        const progress = getWaveProgress(wave, world.gameTime, travelDuration);
        const peakY = progressToScreenY(progress, oceanTop, oceanBottom);
        const troughY = peakY + halfSpacing;
        const nextPeakY = peakY + waveSpacing;
        const currentTroughColor = getTroughColor(wave.amplitude);

        // When bathymetry is showing, make waves semi-transparent so you can see both
        ctx.globalAlpha = toggles.showBathymetry ? 0.7 : 1.0;

        // First half: peak (dark) to trough (light)
        if (troughY > 0 && peakY < shoreY) {
            const grad1 = ctx.createLinearGradient(0, peakY, 0, troughY);
            grad1.addColorStop(0, colors.swellPeak);
            grad1.addColorStop(1, currentTroughColor);
            ctx.fillStyle = grad1;
            ctx.fillRect(0, Math.max(0, peakY), w, Math.min(troughY, shoreY) - Math.max(0, peakY));
        }

        // Second half: trough (light) to next peak (dark)
        if (nextPeakY > 0 && troughY < shoreY) {
            const grad2 = ctx.createLinearGradient(0, troughY, 0, nextPeakY);
            grad2.addColorStop(0, currentTroughColor);
            grad2.addColorStop(1, colors.swellPeak);
            ctx.fillStyle = grad2;
            ctx.fillRect(0, Math.max(0, troughY), w, Math.min(nextPeakY, shoreY) - Math.max(0, troughY));
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

    // Helper function to draw contours from a grid
    function drawContours(grid, gridW, gridH, thresholds, colorPrefix) {
        const blurred = boxBlur(grid, gridW, gridH, 2);
        for (const { value, baseColor, lineWidth } of thresholds) {
            const segments = extractLineSegments(blurred, gridW, gridH, value);

            ctx.strokeStyle = colorPrefix ? `${colorPrefix}` : baseColor;
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
            displayWaves={displayWaves}
            foamCount={world.foamSegments.length}
            timeScale={timeScale}
            onTimeScaleChange={handleTimeScaleChange}
            toggles={toggles}
            onToggle={handleToggle}
            fps={displayFps}
            playerConfig={PLAYER_PROXY_CONFIG}
            onPlayerConfigChange={handlePlayerConfigChange}
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

requestAnimationFrame(gameLoop);

console.log('Wave Sets and Lulls visualization');
console.log('Background waves always present, set waves only during SET state');
