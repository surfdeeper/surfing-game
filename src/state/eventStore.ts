/**
 * Event Store - Lightweight event sourcing for game state
 *
 * Features:
 * - Event dispatch and replay
 * - State subscriptions
 * - Event history for debugging/testing
 * - Deterministic state from event replay
 */

import { createWave } from './waveModel.js';
import { createInitialState as createSetLullState, DEFAULT_CONFIG } from './setLullModel.js';
import { createInitialBackgroundState, BACKGROUND_CONFIG } from './backgroundWaveModel.js';
import { createEnergyField, FIELD_HEIGHT, FIELD_WIDTH } from '@layers/03-energy-field';
import { DEFAULT_BATHYMETRY } from '@layers/01-bottom-depth';
import { createFoamGrids } from './foamGridModel.js';

// Event types
export const EventType = {
  // Game lifecycle
  GAME_INIT: 'GAME_INIT',
  GAME_TICK: 'GAME_TICK',

  // Waves
  WAVE_SPAWN: 'WAVE_SPAWN',
  WAVE_REMOVE: 'WAVE_REMOVE',
  WAVES_UPDATE: 'WAVES_UPDATE',

  // Foam
  FOAM_ROW_ADD: 'FOAM_ROW_ADD',
  FOAM_ROWS_UPDATE: 'FOAM_ROWS_UPDATE',
  FOAM_SEGMENTS_UPDATE: 'FOAM_SEGMENTS_UPDATE',

  // Settings/toggles
  TOGGLE_CHANGE: 'TOGGLE_CHANGE',
  TIME_SCALE_CHANGE: 'TIME_SCALE_CHANGE',

  // Player
  PLAYER_MOVE: 'PLAYER_MOVE',
  PLAYER_INIT: 'PLAYER_INIT',
  PLAYER_UPDATE: 'PLAYER_UPDATE',
  AI_UPDATE: 'AI_UPDATE',

  // State machines
  SET_LULL_UPDATE: 'SET_LULL_UPDATE',
  BACKGROUND_UPDATE: 'BACKGROUND_UPDATE',

  // Energy field
  ENERGY_UPDATE: 'ENERGY_UPDATE',
};

/**
 * Create initial game state
 */
export function createInitialState() {
  const foamLayers = createFoamGrids();
  return {
    // Core game time
    gameTime: 0,
    timeScale: 1,

    // World parameters
    shoreHeight: 100,
    swellSpacing: 80,
    swellSpeed: 50,

    // Dynamic state
    waves: [],
    foamRows: [], // legacy (debug)
    foamSegments: [], // legacy (debug)
    foamGrid: foamLayers.foam,
    energyTransferGrid: foamLayers.energyTransfer,
    foamGridWidth: FIELD_WIDTH,
    foamGridHeight: FIELD_HEIGHT,

    // State machines
    setConfig: DEFAULT_CONFIG,
    setLullState: createSetLullState(DEFAULT_CONFIG),
    backgroundConfig: BACKGROUND_CONFIG,
    backgroundState: createInitialBackgroundState(BACKGROUND_CONFIG),

    // Bathymetry
    bathymetry: DEFAULT_BATHYMETRY,

    // Player
    playerProxy: null,
    aiState: null,
    aiMode: 'INTERMEDIATE',
    lastAIInput: { left: false, right: false, up: false, down: false },

    // Energy field
    energyField: createEnergyField(),

    // UI toggles
    toggles: {
      showBathymetry: false,
      showSetWaves: true,
      showBackgroundWaves: true,
      showFoamZones: true,
      showFoamSamples: false,
      showPlayer: false,
      showAIPlayer: false,
      showFoamOptionA: false,
      showFoamOptionB: false,
      showFoamOptionC: false,
      showEnergyField: false,
      depthDampingCoefficient: 0.1,
      depthDampingExponent: 2.0,
    },
  };
}

/**
 * Game state reducer - pure function that produces new state from events
 */
export function reducer(state, event) {
  switch (event.type) {
    case EventType.GAME_INIT:
      return createInitialState();

    case EventType.GAME_TICK:
      return {
        ...state,
        gameTime: state.gameTime + event.deltaTime,
      };

    case EventType.WAVE_SPAWN:
      return {
        ...state,
        waves: [...state.waves, createWave(state.gameTime, event.amplitude, event.waveType)],
      };

    case EventType.WAVE_REMOVE:
      return {
        ...state,
        waves: state.waves.filter((w) => w.id !== event.waveId),
      };

    case EventType.WAVES_UPDATE:
      return {
        ...state,
        waves: event.waves,
      };

    case EventType.FOAM_ROW_ADD:
      return {
        ...state,
        foamRows: [...state.foamRows, event.row],
      };

    case EventType.FOAM_ROWS_UPDATE:
      return {
        ...state,
        foamRows: event.foamRows,
      };

    case EventType.FOAM_SEGMENTS_UPDATE:
      return {
        ...state,
        foamSegments: event.foamSegments,
      };

    case EventType.TOGGLE_CHANGE:
      return {
        ...state,
        toggles: {
          ...state.toggles,
          [event.key]: event.value,
        },
      };

    case EventType.TIME_SCALE_CHANGE:
      return {
        ...state,
        timeScale: event.timeScale,
      };

    case EventType.PLAYER_INIT:
      return {
        ...state,
        playerProxy: event.playerProxy,
      };

    case EventType.PLAYER_MOVE:
      return {
        ...state,
        playerProxy: {
          ...state.playerProxy,
          x: event.x,
          y: event.y,
        },
      };

    case EventType.PLAYER_UPDATE:
      return {
        ...state,
        playerProxy: event.playerProxy,
        aiState: event.aiState,
        lastAIInput: event.lastAIInput,
      };

    case EventType.AI_UPDATE:
      return {
        ...state,
        aiMode: event.aiMode,
        aiState: event.aiState,
      };

    case EventType.SET_LULL_UPDATE:
      return {
        ...state,
        setLullState: event.setLullState,
      };

    case EventType.BACKGROUND_UPDATE:
      return {
        ...state,
        backgroundState: event.backgroundState,
      };

    case EventType.ENERGY_UPDATE:
      return {
        ...state,
        energyField: event.energyField,
      };

    default:
      return state;
  }
}

/**
 * Create an event store instance
 */
export function createEventStore(initialState = null) {
  let state = initialState || createInitialState();
  const events = [];
  const subscribers: Set<(state: any, event: any) => void> = new Set();

  return {
    /**
     * Get current state (read-only snapshot)
     */
    getState() {
      return state;
    },

    /**
     * Dispatch an event to update state
     */
    dispatch(event) {
      const timestampedEvent = {
        ...event,
        _timestamp: performance.now(),
        _gameTime: state.gameTime,
      };
      events.push(timestampedEvent);
      state = reducer(state, event);

      // Notify subscribers
      for (const subscriber of subscribers) {
        subscriber(state, event);
      }

      return state;
    },

    /**
     * Batch multiple events into a single state update (performance optimization)
     * Reduces overhead by only notifying subscribers once after all events
     * @param {Array} eventList - Array of events to dispatch
     */
    batchDispatch(eventList) {
      const timestamp = performance.now();
      for (const event of eventList) {
        const timestampedEvent = {
          ...event,
          _timestamp: timestamp,
          _gameTime: state.gameTime,
        };
        events.push(timestampedEvent);
        state = reducer(state, event);
      }

      // Notify subscribers once with the last event
      if (eventList.length > 0) {
        const lastEvent = eventList[eventList.length - 1];
        for (const subscriber of subscribers) {
          subscriber(state, lastEvent);
        }
      }

      return state;
    },

    /**
     * Subscribe to state changes
     * @returns Unsubscribe function
     */
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },

    /**
     * Get event history (for debugging/replay)
     */
    getEvents() {
      return [...events];
    },

    /**
     * Replay events to reconstruct state
     */
    replay(eventLog) {
      state = createInitialState();
      events.length = 0;
      for (const event of eventLog) {
        state = reducer(state, event);
        events.push(event);
      }
      return state;
    },

    /**
     * Clear event history (keeps current state)
     */
    clearHistory() {
      events.length = 0;
    },

    /**
     * Reset to initial state
     */
    reset() {
      state = createInitialState();
      events.length = 0;
      for (const subscriber of subscribers) {
        subscriber(state, { type: EventType.GAME_INIT });
      }
    },
  };
}

// Default singleton store for the game
let defaultStore = null;

export function getStore() {
  if (!defaultStore) {
    defaultStore = createEventStore();
  }
  return defaultStore;
}

export function resetStore() {
  defaultStore = null;
}
