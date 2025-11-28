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
    shouldWaveBreakAtDepth,
    markBreakTriggered,
    hasBreakTriggeredAt,
} from './state/waveModel.js';
import { createFoam, updateFoam, getActiveFoam } from './state/foamModel.js';
import { DEFAULT_BATHYMETRY, getDepth, getPeakX } from './state/bathymetryModel.js';
import { progressToScreenY, getOceanBounds, calculateTravelDuration } from './render/coordinates.js';
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

    // Set/lull configuration (used by setLullModel)
    setConfig: DEFAULT_CONFIG,

    // Set/lull state machine (managed by setLullModel)
    setLullState: createInitialState(DEFAULT_CONFIG),

    // Background wave configuration and state
    backgroundConfig: BACKGROUND_CONFIG,
    backgroundState: createInitialBackgroundState(BACKGROUND_CONFIG),

    // Bathymetry (ocean floor depth map)
    bathymetry: DEFAULT_BATHYMETRY,
};

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
let showBathymetry = localStorage.getItem('showBathymetry') === 'true';
let showSetWaves = localStorage.getItem('showSetWaves') !== 'false';  // default true
let showBackgroundWaves = localStorage.getItem('showBackgroundWaves') !== 'false';  // default true

// Helper to save toggle state
function saveToggleState() {
    localStorage.setItem('showBathymetry', showBathymetry);
    localStorage.setItem('showSetWaves', showSetWaves);
    localStorage.setItem('showBackgroundWaves', showBackgroundWaves);
}

// Game state persistence - save waves, time, set/lull state
function saveGameState() {
    const state = {
        gameTime: world.gameTime,
        timeScale,
        // Convert wave Sets to Arrays for JSON serialization
        waves: world.waves.map(w => ({
            ...w,
            hasTriggeredBreakAt: Array.from(w.hasTriggeredBreakAt)
        })),
        foamSegments: world.foamSegments,
        setLullState: world.setLullState,
        backgroundState: world.backgroundState,
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
        // Convert wave Arrays back to Sets
        world.waves = (state.waves || []).map(w => ({
            ...w,
            hasTriggeredBreakAt: new Set(w.hasTriggeredBreakAt || [])
        }));
        world.foamSegments = state.foamSegments || [];
        if (state.setLullState) world.setLullState = state.setLullState;
        if (state.backgroundState) world.backgroundState = state.backgroundState;
        return true;
    } catch (e) {
        console.warn('Failed to load game state:', e);
        return false;
    }
}

// Load saved state on startup
loadGameState();

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') {
        const currentIndex = TIME_SCALES.indexOf(timeScale);
        const nextIndex = (currentIndex + 1) % TIME_SCALES.length;
        timeScale = TIME_SCALES[nextIndex];
    }
    if (e.key === 'b' || e.key === 'B') {
        showBathymetry = !showBathymetry;
        saveToggleState();
    }
    if (e.key === 's' || e.key === 'S') {
        showSetWaves = !showSetWaves;
        saveToggleState();
    }
    if (e.key === 'g' || e.key === 'G') {
        showBackgroundWaves = !showBackgroundWaves;
        saveToggleState();
    }
});

// Button definitions for click handling
const buttons = [];

function registerButton(id, x, y, width, height, onClick) {
    buttons.push({ id, x, y, width, height, onClick });
}

function clearButtons() {
    buttons.length = 0;
}

// Mouse click handling
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (const btn of buttons) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.width &&
            mouseY >= btn.y && mouseY <= btn.y + btn.height) {
            btn.onClick();
            break;
        }
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

    // Check for breaking and spawn foam (depth-based)
    // We check multiple x-zones across the screen
    const numZones = 10;  // Number of x-positions to check
    for (const wave of world.waves) {
        const progress = getWaveProgress(wave, world.gameTime, travelDuration);
        const waveY = progressToScreenY(progress, oceanTop, oceanBottom);

        for (let zone = 0; zone < numZones; zone++) {
            // Skip if we already spawned foam at this zone for this wave
            if (hasBreakTriggeredAt(wave, zone)) {
                continue;
            }

            const normalizedX = (zone + 0.5) / numZones;  // Center of zone
            const depth = getDepth(normalizedX, world.bathymetry, progress);

            if (shouldWaveBreakAtDepth(wave, progress, depth)) {
                // Spawn independent foam entity at this location
                const foam = createFoam(world.gameTime, normalizedX, waveY, wave.id);
                world.foamSegments.push(foam);
                markBreakTriggered(wave, zone);
            }
        }
    }

    // Update existing foam segments (they move and fade independently)
    for (const foam of world.foamSegments) {
        updateFoam(foam, scaledDelta, world.gameTime);
    }

    // Remove dead foam (faded or past shore)
    world.foamSegments = getActiveFoam(world.foamSegments, shoreY);

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
    if (showBathymetry) {
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
        ctx.globalAlpha = showBathymetry ? 0.7 : 1.0;

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
        const isVisible = isSetWave ? showSetWaves : showBackgroundWaves;
        if (isVisible) {
            drawWave(wave);
        }
    }
    ctx.globalAlpha = 1.0; // Reset alpha after waves

    // Draw foam segments (independent entities, NOT attached to waves)
    // Foam persists after waves pass, creating whitewater trails
    for (const foam of world.foamSegments) {
        if (foam.opacity <= 0) continue;

        const centerX = foam.x * w;
        const halfWidth = (foam.width * w) / 2;

        // Draw foam as horizontal band (whitewater), not triangle
        // This is the main foam body
        ctx.fillStyle = `rgba(255, 255, 255, ${foam.opacity * 0.8})`;
        ctx.fillRect(centerX - halfWidth, foam.y, halfWidth * 2, 12);

        // Add some texture/bubbles
        ctx.fillStyle = `rgba(255, 255, 255, ${foam.opacity * 0.5})`;
        const numBubbles = 3;
        for (let i = 0; i < numBubbles; i++) {
            const bubbleX = centerX - halfWidth + (halfWidth * 2) * (i + 0.5) / numBubbles;
            const bubbleY = foam.y + 6 + Math.sin(foam.spawnTime / 100 + i) * 3;
            const bubbleR = 3 + Math.cos(foam.spawnTime / 80 + i * 2) * 1.5;
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, bubbleR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Debug: show foam count
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`Foam segments: ${world.foamSegments.length}`, 10, h - 40);

    // Clear button registry each frame (buttons are re-registered below)
    clearButtons();

    // Draw toggle buttons (bottom left) - clickable!
    const buttonY = h - 70;
    const buttonHeight = 22;
    const buttonPadding = 8;
    const buttonGap = 8;
    let buttonX = 10;
    ctx.font = '12px monospace';

    // Helper to draw a button and register it for clicks
    const drawButton = (text, isActive, activeColor, onClick) => {
        const btnWidth = ctx.measureText(text).width + buttonPadding * 2;
        ctx.fillStyle = isActive ? activeColor : 'rgba(80, 80, 80, 0.8)';
        ctx.fillRect(buttonX, buttonY, btnWidth, buttonHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(buttonX, buttonY, btnWidth, buttonHeight);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, buttonX + buttonPadding, buttonY + 15);
        registerButton(text, buttonX, buttonY, btnWidth, buttonHeight, onClick);
        buttonX += btnWidth + buttonGap;
        return btnWidth;
    };

    // Layer toggle buttons
    drawButton(
        `[B] Bathymetry ${showBathymetry ? 'ON' : 'OFF'}`,
        showBathymetry,
        'rgba(200, 160, 60, 0.8)',
        () => { showBathymetry = !showBathymetry; saveToggleState(); }
    );
    drawButton(
        `[S] Set Waves ${showSetWaves ? 'ON' : 'OFF'}`,
        showSetWaves,
        'rgba(70, 130, 180, 0.8)',
        () => { showSetWaves = !showSetWaves; saveToggleState(); }
    );
    drawButton(
        `[G] Background ${showBackgroundWaves ? 'ON' : 'OFF'}`,
        showBackgroundWaves,
        'rgba(100, 150, 180, 0.8)',
        () => { showBackgroundWaves = !showBackgroundWaves; saveToggleState(); }
    );
    drawButton(
        `[T] Speed ${timeScale}x`,
        timeScale > 1,
        'rgba(100, 180, 100, 0.8)',
        () => {
            const currentIndex = TIME_SCALES.indexOf(timeScale);
            const nextIndex = (currentIndex + 1) % TIME_SCALES.length;
            timeScale = TIME_SCALES[nextIndex];
        }
    );

    // Bathymetry legend (when active)
    if (showBathymetry) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, buttonY - 55, 150, 50);
        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        ctx.fillText('Ocean Floor Depth:', 15, buttonY - 40);
        // Color swatches
        ctx.fillStyle = 'rgb(200, 160, 60)';
        ctx.fillRect(15, buttonY - 30, 12, 12);
        ctx.fillStyle = '#fff';
        ctx.fillText('Shallow', 32, buttonY - 20);
        ctx.fillStyle = 'rgb(60, 40, 20)';
        ctx.fillRect(85, buttonY - 30, 12, 12);
        ctx.fillStyle = '#fff';
        ctx.fillText('Deep', 102, buttonY - 20);
    }

    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText('Wave sets and lulls (v2)', 10, 30);
    ctx.fillText('Shore', 10, h - 20);

    // Debug UI: Set/Lull status (read from setLullState)
    const sls = world.setLullState;
    const stateLabel = sls.setState;
    const nextWaveIn = Math.max(0, sls.nextWaveTime - sls.timeSinceLastWave).toFixed(1);
    const waveTimerProgress = Math.min(sls.timeSinceLastWave / sls.nextWaveTime, 1);
    const stateTimeLeft = Math.max(0, sls.setDuration - sls.setTimer).toFixed(1);
    const stateTimerProgress = Math.min(sls.setTimer / sls.setDuration, 1);
    const stateLabel2 = sls.setState === 'LULL' ? 'Until set' : 'Set ends';

    // Filter waves for display (exclude at-shore)
    const displayWaves = world.waves
        .map(wave => ({
            wave,
            progress: getWaveProgress(wave, world.gameTime, travelDuration)
        }))
        .filter(({ progress }) => progress < 1)
        .sort((a, b) => a.progress - b.progress);  // ascending: horizon first

    // Count by type
    const setWaveCount = displayWaves.filter(({ wave }) => wave.type === WAVE_TYPE.SET).length;
    const bgWaveCount = displayWaves.filter(({ wave }) => wave.type === WAVE_TYPE.BACKGROUND).length;

    // Calculate panel height based on wave count (each wave needs space for text + progress bar)
    const baseHeight = 150;  // Increased to fit background wave count
    const waveItemHeight = 28;  // 16 for text + 12 for progress bar
    // Only show set waves in detail list (background waves just get a count)
    const displaySetWaves = displayWaves.filter(({ wave }) => wave.type === WAVE_TYPE.SET);
    const waveListHeight = displaySetWaves.length * waveItemHeight;
    const panelHeight = baseHeight + waveListHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(w - 220, 10, 210, panelHeight);

    ctx.fillStyle = '#fff';
    ctx.fillText(`State: ${stateLabel} (${sls.wavesSpawned}/${sls.currentSetWaves})`, w - 210, 30);

    ctx.fillText(`Next wave: ${nextWaveIn}s`, w - 210, 50);
    // Next wave progress bar (countdown - starts full, empties as time passes)
    ctx.fillStyle = '#333';
    ctx.fillRect(w - 210, 55, 190, 8);
    ctx.fillStyle = '#4a90b8';
    ctx.fillRect(w - 210, 55, 190 * (1 - waveTimerProgress), 8);

    ctx.fillStyle = '#fff';
    ctx.fillText(`${stateLabel2}: ${stateTimeLeft}s`, w - 210, 80);
    // State duration progress bar (countdown - starts full, empties as time passes)
    ctx.fillStyle = '#333';
    ctx.fillRect(w - 210, 85, 190, 8);
    ctx.fillStyle = sls.setState === 'LULL' ? '#e8a644' : '#44e8a6';
    ctx.fillRect(w - 210, 85, 190 * (1 - stateTimerProgress), 8);

    ctx.fillStyle = '#fff';
    ctx.fillText(`Set waves: ${setWaveCount}`, w - 210, 115);

    ctx.fillStyle = '#888';
    ctx.fillText(`Background: ${bgWaveCount}`, w - 210, 135);

    for (let i = 0; i < displaySetWaves.length; i++) {
        const { wave, progress } = displaySetWaves[i];
        // Time to shore = remaining progress * travel duration (convert to seconds)
        const timeToShore = ((1 - progress) * travelDuration / 1000).toFixed(1);
        const ampPercent = Math.round(wave.amplitude * 100);
        const yOffset = 150 + i * waveItemHeight;

        // Wave text
        ctx.fillStyle = '#aaa';
        ctx.fillText(`  • ${ampPercent}% amp, ${timeToShore}s`, w - 210, yOffset);

        // Wave progress bar (countdown - starts full at horizon, empties as wave approaches shore)
        ctx.fillStyle = '#333';
        ctx.fillRect(w - 195, yOffset + 4, 175, 6);
        ctx.fillStyle = '#6ab0d4';  // Lighter blue for wave progress
        ctx.fillRect(w - 195, yOffset + 4, 175 * (1 - progress), 6);
    }
}

// Game loop
const MAX_DELTA_TIME = 0.1;  // 100ms max - prevents huge jumps after tab restore
let lastTime = 0;

function gameLoop(timestamp) {
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Clamp deltaTime to prevent huge jumps when returning from background
    if (deltaTime > MAX_DELTA_TIME) {
        deltaTime = MAX_DELTA_TIME;
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
