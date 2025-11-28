import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    createEventStore,
    createInitialState,
    reducer,
    EventType,
    getStore,
    resetStore,
} from './eventStore.js';
import { WAVE_TYPE } from './waveModel.js';

describe('eventStore', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('createInitialState', () => {
        it('creates state with all required fields', () => {
            const state = createInitialState();

            expect(state.gameTime).toBe(0);
            expect(state.timeScale).toBe(1);
            expect(state.waves).toEqual([]);
            expect(state.foamRows).toEqual([]);
            expect(state.toggles).toBeDefined();
            expect(state.toggles.showSetWaves).toBe(true);
            expect(state.toggles.showBathymetry).toBe(false);
        });

        it('creates state with energy field', () => {
            const state = createInitialState();
            expect(state.energyField).toBeDefined();
            expect(state.energyField.height).toBeDefined();
            expect(state.energyField.width).toBeGreaterThan(0);
        });
    });

    describe('reducer', () => {
        it('handles GAME_TICK', () => {
            const state = createInitialState();
            const newState = reducer(state, { type: EventType.GAME_TICK, deltaTime: 100 });

            expect(newState.gameTime).toBe(100);
            expect(state.gameTime).toBe(0); // Original unchanged
        });

        it('handles WAVE_SPAWN', () => {
            const state = { ...createInitialState(), gameTime: 1000 };
            const newState = reducer(state, {
                type: EventType.WAVE_SPAWN,
                amplitude: 0.8,
                waveType: WAVE_TYPE.SET,
            });

            expect(newState.waves).toHaveLength(1);
            expect(newState.waves[0].amplitude).toBe(0.8);
            expect(newState.waves[0].type).toBe(WAVE_TYPE.SET);
            expect(newState.waves[0].spawnTime).toBe(1000);
        });

        it('handles WAVE_REMOVE', () => {
            let state = { ...createInitialState(), gameTime: 1000 };
            state = reducer(state, { type: EventType.WAVE_SPAWN, amplitude: 0.8, waveType: WAVE_TYPE.SET });
            const waveId = state.waves[0].id;

            const newState = reducer(state, { type: EventType.WAVE_REMOVE, waveId });
            expect(newState.waves).toHaveLength(0);
        });

        it('handles TOGGLE_CHANGE', () => {
            const state = createInitialState();
            const newState = reducer(state, {
                type: EventType.TOGGLE_CHANGE,
                key: 'showBathymetry',
                value: true,
            });

            expect(newState.toggles.showBathymetry).toBe(true);
            expect(state.toggles.showBathymetry).toBe(false); // Original unchanged
        });

        it('handles TIME_SCALE_CHANGE', () => {
            const state = createInitialState();
            const newState = reducer(state, {
                type: EventType.TIME_SCALE_CHANGE,
                timeScale: 4,
            });

            expect(newState.timeScale).toBe(4);
        });

        it('returns same state for unknown event type', () => {
            const state = createInitialState();
            const newState = reducer(state, { type: 'UNKNOWN_EVENT' });

            expect(newState).toBe(state);
        });
    });

    describe('createEventStore', () => {
        it('creates store with initial state', () => {
            const store = createEventStore();
            const state = store.getState();

            expect(state.gameTime).toBe(0);
            expect(state.waves).toEqual([]);
        });

        it('accepts custom initial state', () => {
            const customState = { ...createInitialState(), gameTime: 5000 };
            const store = createEventStore(customState);

            expect(store.getState().gameTime).toBe(5000);
        });

        it('dispatch updates state', () => {
            const store = createEventStore();
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 100 });

            expect(store.getState().gameTime).toBe(100);
        });

        it('dispatch records events', () => {
            const store = createEventStore();
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 100 });
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 50 });

            const events = store.getEvents();
            expect(events).toHaveLength(2);
            expect(events[0].deltaTime).toBe(100);
            expect(events[1].deltaTime).toBe(50);
        });

        it('dispatch adds timestamps to events', () => {
            const store = createEventStore();
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 100 });

            const events = store.getEvents();
            expect(events[0]._timestamp).toBeDefined();
            expect(events[0]._gameTime).toBe(0);
        });

        it('subscribe notifies on state changes', () => {
            const store = createEventStore();
            const callback = vi.fn();

            store.subscribe(callback);
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 100 });

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ gameTime: 100 }),
                expect.objectContaining({ type: EventType.GAME_TICK })
            );
        });

        it('unsubscribe stops notifications', () => {
            const store = createEventStore();
            const callback = vi.fn();

            const unsubscribe = store.subscribe(callback);
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 100 });
            unsubscribe();
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 100 });

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('replay reconstructs state from events', () => {
            const store = createEventStore();

            // Build up some state
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 1000 });
            store.dispatch({ type: EventType.WAVE_SPAWN, amplitude: 0.8, waveType: WAVE_TYPE.SET });
            store.dispatch({ type: EventType.TOGGLE_CHANGE, key: 'showBathymetry', value: true });

            const events = store.getEvents();

            // Create new store and replay
            const newStore = createEventStore();
            newStore.replay(events);

            expect(newStore.getState().gameTime).toBe(1000);
            expect(newStore.getState().waves).toHaveLength(1);
            expect(newStore.getState().toggles.showBathymetry).toBe(true);
        });

        it('clearHistory keeps state but clears events', () => {
            const store = createEventStore();
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 1000 });

            expect(store.getEvents()).toHaveLength(1);
            store.clearHistory();

            expect(store.getEvents()).toHaveLength(0);
            expect(store.getState().gameTime).toBe(1000);
        });

        it('reset returns to initial state', () => {
            const store = createEventStore();
            store.dispatch({ type: EventType.GAME_TICK, deltaTime: 1000 });
            store.dispatch({ type: EventType.WAVE_SPAWN, amplitude: 0.8, waveType: WAVE_TYPE.SET });

            store.reset();

            expect(store.getState().gameTime).toBe(0);
            expect(store.getState().waves).toEqual([]);
            expect(store.getEvents()).toHaveLength(0);
        });

        it('reset notifies subscribers', () => {
            const store = createEventStore();
            const callback = vi.fn();

            store.subscribe(callback);
            store.reset();

            expect(callback).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ type: EventType.GAME_INIT })
            );
        });
    });

    describe('getStore singleton', () => {
        it('returns same store instance', () => {
            const store1 = getStore();
            const store2 = getStore();

            expect(store1).toBe(store2);
        });

        it('resetStore clears singleton', () => {
            const store1 = getStore();
            resetStore();
            const store2 = getStore();

            expect(store1).not.toBe(store2);
        });
    });

    describe('deterministic replay', () => {
        it('same events produce same state', () => {
            const events = [
                { type: EventType.GAME_TICK, deltaTime: 1000 },
                { type: EventType.WAVE_SPAWN, amplitude: 0.8, waveType: WAVE_TYPE.SET },
                { type: EventType.GAME_TICK, deltaTime: 500 },
                { type: EventType.TOGGLE_CHANGE, key: 'showPlayer', value: true },
            ];

            const store1 = createEventStore();
            const store2 = createEventStore();

            for (const event of events) {
                store1.dispatch(event);
                store2.dispatch(event);
            }

            // States should be equivalent
            expect(store1.getState().gameTime).toBe(store2.getState().gameTime);
            expect(store1.getState().waves.length).toBe(store2.getState().waves.length);
            expect(store1.getState().toggles).toEqual(store2.getState().toggles);
        });
    });
});
