/**
 * Update Orchestrator - Coordinates all game state updates
 *
 * This module extracts the update logic from main.jsx into testable functions.
 * Each function returns events that can be dispatched to the event store.
 */

import { updateSetLullState } from '../state/setLullModel.js';
import { updateBackgroundWaveState } from '../state/backgroundWaveModel.js';
import { getActiveWaves, updateWaveRefraction, getWaveProgress, isWaveBreaking, isWaveBreakingWithEnergy, WAVE_TYPE } from '../state/waveModel.js';
import { createFoam, updateFoam, getActiveFoam } from '../state/foamModel.js';
import { updateEnergyField, getHeightAt, drainEnergyAt, injectWavePulse } from '../state/energyFieldModel.js';
import { updatePlayerProxy, createPlayerProxy, PLAYER_PROXY_CONFIG } from '../state/playerProxyModel.js';
import { updateAIPlayer, createAIState } from '../state/aiPlayerModel.js';
import { getDepth } from '../state/bathymetryModel.js';
import { EventType } from '../state/eventStore.js';

/**
 * Calculate ocean bounds from canvas dimensions
 */
export function getOceanBounds(canvasHeight, shoreHeight) {
    const shoreY = canvasHeight - shoreHeight;
    const oceanTop = 0;
    const oceanBottom = shoreY;
    return { oceanTop, oceanBottom, shoreY };
}

/**
 * Calculate how long a wave takes to travel from horizon to shore
 */
export function calculateTravelDuration(oceanHeight, swellSpeed) {
    return (oceanHeight / swellSpeed) * 1000; // in ms
}

/**
 * Convert progress (0-1) to screen Y position
 */
export function progressToScreenY(progress, oceanTop, oceanBottom) {
    return oceanTop + progress * (oceanBottom - oceanTop);
}

/**
 * Convert screen Y to progress (0-1)
 */
export function screenYToProgress(y, oceanTop, oceanBottom) {
    return (y - oceanTop) / (oceanBottom - oceanTop);
}

/**
 * Update wave spawning state machines
 * @returns {object} { events, setLullState, backgroundState }
 */
export function updateWaveSpawning(state, deltaTime, gameTime, config) {
    const events = [];

    // Update set/lull state machine
    const setResult = updateSetLullState(state.setLullState, gameTime, state.setConfig);

    if (setResult.shouldSpawn) {
        events.push({
            type: EventType.WAVE_SPAWN,
            amplitude: setResult.amplitude,
            waveType: WAVE_TYPE.SET,
        });
    }

    // Update background wave state
    const bgResult = updateBackgroundWaveState(state.backgroundState, deltaTime, state.backgroundConfig);

    if (bgResult.shouldSpawn) {
        events.push({
            type: EventType.WAVE_SPAWN,
            amplitude: bgResult.amplitude,
            waveType: WAVE_TYPE.BACKGROUND,
        });
    }

    return {
        events,
        setLullState: setResult.state,
        backgroundState: bgResult.state,
    };
}

/**
 * Update wave lifecycle and refraction
 */
export function updateWaves(waves, gameTime, travelDuration, bufferDuration, bathymetry) {
    // Filter to active waves
    const activeWaves = getActiveWaves(waves, gameTime - bufferDuration, travelDuration);

    // Update refraction for each wave
    const getDepthFn = (normalizedX, progress) => getDepth(normalizedX, bathymetry, progress);

    for (const wave of activeWaves) {
        updateWaveRefraction(wave, gameTime, travelDuration, getDepthFn, bathymetry.deepDepth);
    }

    return activeWaves;
}

/**
 * Deposit foam where waves are breaking
 */
export function depositFoam(waves, foamSegments, state) {
    const { gameTime, bathymetry, energyField } = state;
    const { oceanTop, oceanBottom } = getOceanBounds(state.canvasHeight, state.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, state.swellSpeed);

    const numXSamples = 80;
    const foamYSpacing = 3;
    const newFoamSegments = [...foamSegments];
    const useEnergyField = state.showEnergyField;

    for (const wave of waves) {
        const progress = getWaveProgress(wave, gameTime, travelDuration);
        const waveY = progressToScreenY(progress, oceanTop, oceanBottom);

        if (wave.lastFoamY >= 0 && Math.abs(waveY - wave.lastFoamY) < foamYSpacing) {
            continue;
        }

        const startY = wave.lastFoamY >= 0 ? wave.lastFoamY : waveY;
        const yDelta = waveY - startY;
        const direction = Math.sign(yDelta);
        const numRows = Math.max(1, Math.floor(Math.abs(yDelta) / foamYSpacing));

        for (let row = 0; row < numRows; row++) {
            const foamY = startY + direction * (row + 1) * foamYSpacing;
            const foamProgress = screenYToProgress(foamY, oceanTop, oceanBottom);

            let depositedAny = false;
            for (let i = 0; i < numXSamples; i++) {
                const normalizedX = (i + 0.5) / numXSamples;
                const depth = getDepth(normalizedX, bathymetry, foamProgress);

                let shouldBreak;
                let energyAtPoint = 0;
                if (useEnergyField) {
                    energyAtPoint = getHeightAt(energyField, normalizedX, foamProgress);
                    shouldBreak = isWaveBreakingWithEnergy(wave, depth, energyAtPoint);
                } else {
                    shouldBreak = isWaveBreaking(wave, depth);
                }

                if (shouldBreak) {
                    let energyReleased = wave.amplitude;
                    if (useEnergyField) {
                        energyReleased = drainEnergyAt(energyField, normalizedX, foamProgress, wave.amplitude * 20.0);
                    }

                    const foam = createFoam(gameTime, normalizedX, foamY, wave.id);
                    foam.opacity = Math.min(1.0, energyReleased * 2);
                    newFoamSegments.push(foam);
                    depositedAny = true;
                }
            }

            if (depositedAny) {
                wave.lastFoamY = foamY;
            }
        }
    }

    return newFoamSegments;
}

/**
 * Update existing foam (fade) and remove faded
 */
export function updateFoamLifecycle(foamSegments, deltaTime, gameTime) {
    for (const foam of foamSegments) {
        updateFoam(foam, deltaTime, gameTime);
    }
    return getActiveFoam(foamSegments);
}

/**
 * Deposit foam rows (span-based) for smooth rendering
 */
export function depositFoamRows(waves, foamRows, state) {
    const { gameTime, bathymetry } = state;
    const { oceanTop, oceanBottom } = getOceanBounds(state.canvasHeight, state.shoreHeight);
    const travelDuration = calculateTravelDuration(oceanBottom, state.swellSpeed);

    const numXSamples = 80;
    const foamYSpacing = 3;
    const newFoamRows = [...foamRows];

    for (const wave of waves) {
        const progress = getWaveProgress(wave, gameTime, travelDuration);
        const waveY = progressToScreenY(progress, oceanTop, oceanBottom);

        if (wave.lastFoamRowY >= 0 && Math.abs(waveY - wave.lastFoamRowY) < foamYSpacing) {
            continue;
        }

        const startY = wave.lastFoamRowY >= 0 ? wave.lastFoamRowY : waveY;
        const yDelta = waveY - startY;
        const direction = Math.sign(yDelta);
        const numRowsToDeposit = Math.max(1, Math.floor(Math.abs(yDelta) / foamYSpacing));

        for (let rowIdx = 0; rowIdx < numRowsToDeposit; rowIdx++) {
            const foamY = startY + direction * (rowIdx + 1) * foamYSpacing;
            const foamProgress = screenYToProgress(foamY, oceanTop, oceanBottom);

            const segments = [];
            let spanStart = null;
            let spanIntensitySum = 0;
            let spanSampleCount = 0;

            for (let i = 0; i <= numXSamples; i++) {
                const normalizedX = (i + 0.5) / numXSamples;
                const depth = i < numXSamples ? getDepth(normalizedX, bathymetry, foamProgress) : Infinity;
                const breaking = i < numXSamples && isWaveBreaking(wave, depth);

                if (breaking) {
                    if (spanStart === null) {
                        spanStart = normalizedX;
                        spanIntensitySum = 0;
                        spanSampleCount = 0;
                    }
                    const intensity = Math.max(0, Math.min(1, 1 - depth / 3));
                    spanIntensitySum += intensity;
                    spanSampleCount++;
                } else if (spanStart !== null) {
                    const avgIntensity = spanSampleCount > 0 ? spanIntensitySum / spanSampleCount : 0.5;
                    segments.push({
                        startX: spanStart,
                        endX: (i - 0.5) / numXSamples,
                        intensity: avgIntensity,
                    });
                    spanStart = null;
                }
            }

            if (segments.length > 0) {
                newFoamRows.push({
                    y: foamY,
                    spawnTime: gameTime,
                    segments,
                });
                wave.lastFoamRowY = foamY;
            }
        }
    }

    return newFoamRows;
}

/**
 * Update and filter foam rows
 */
export function updateFoamRowLifecycle(foamRows, gameTime) {
    const foamRowFadeTime = 4000;
    return foamRows.filter(row => {
        const age = gameTime - row.spawnTime;
        row.opacity = Math.max(0, 1 - age / foamRowFadeTime);
        return row.opacity > 0;
    });
}

/**
 * Update player proxy
 */
export function updatePlayer(playerProxy, aiState, aiMode, input, state) {
    const { canvasWidth, canvasHeight, shoreHeight, swellSpeed, foamRows } = state;
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
        foamRows,
        shoreY,
        canvasWidth,
        canvasHeight,
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

// Re-export utilities for convenience
export { injectWavePulse, updateEnergyField, getDepth };
