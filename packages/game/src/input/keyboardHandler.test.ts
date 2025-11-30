import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createKeyboardHandler } from './keyboardHandler.js';
import { SETTINGS_SCHEMA } from '@surf/core/src/state/settingsModel.js';

describe('keyboardHandler', () => {
  let cleanup;
  let callbacks;

  beforeEach(() => {
    callbacks = {
      onToggle: vi.fn(),
      onTimeScaleChange: vi.fn(),
      onAIModeChange: vi.fn(),
      getToggles: vi.fn(() => ({ showPlayer: false, showAIPlayer: false })),
      getTimeScale: vi.fn(() => 1),
    };
  });

  afterEach(() => {
    if (cleanup) cleanup();
  });

  describe('time scale cycling', () => {
    it('cycles through schema-defined options [1, 2, 4, 8]', () => {
      // Verify schema has expected options
      expect(SETTINGS_SCHEMA.timeScale.options).toEqual([1, 2, 4, 8]);

      cleanup = createKeyboardHandler(callbacks);

      // Simulate pressing 't' at each scale value
      callbacks.getTimeScale.mockReturnValue(1);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
      expect(callbacks.onTimeScaleChange).toHaveBeenLastCalledWith(2);

      callbacks.getTimeScale.mockReturnValue(2);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
      expect(callbacks.onTimeScaleChange).toHaveBeenLastCalledWith(4);

      callbacks.getTimeScale.mockReturnValue(4);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
      expect(callbacks.onTimeScaleChange).toHaveBeenLastCalledWith(8);

      callbacks.getTimeScale.mockReturnValue(8);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
      expect(callbacks.onTimeScaleChange).toHaveBeenLastCalledWith(1); // wraps around
    });
  });

  describe('toggle hotkeys', () => {
    it('calls onToggle for known hotkeys', () => {
      cleanup = createKeyboardHandler(callbacks);

      // 'b' toggles showBathymetry
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      expect(callbacks.onToggle).toHaveBeenCalledWith('showBathymetry');
    });

    it('does not call onToggle for unknown keys', () => {
      cleanup = createKeyboardHandler(callbacks);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      expect(callbacks.onToggle).not.toHaveBeenCalled();
    });
  });

  describe('AI mode', () => {
    it('calls onAIModeChange when m pressed and player+AI enabled', () => {
      callbacks.getToggles.mockReturnValue({ showPlayer: true, showAIPlayer: true });
      cleanup = createKeyboardHandler(callbacks);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
      expect(callbacks.onAIModeChange).toHaveBeenCalled();
    });

    it('does not call onAIModeChange when player disabled', () => {
      callbacks.getToggles.mockReturnValue({ showPlayer: false, showAIPlayer: true });
      cleanup = createKeyboardHandler(callbacks);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
      expect(callbacks.onAIModeChange).not.toHaveBeenCalled();
    });
  });

  describe('AI toggle', () => {
    it('toggles showAIPlayer when a pressed and player enabled', () => {
      callbacks.getToggles.mockReturnValue({ showPlayer: true, showAIPlayer: false });
      cleanup = createKeyboardHandler(callbacks);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callbacks.onToggle).toHaveBeenCalledWith('showAIPlayer');
    });

    it('does not toggle AI when player disabled', () => {
      callbacks.getToggles.mockReturnValue({ showPlayer: false, showAIPlayer: false });
      cleanup = createKeyboardHandler(callbacks);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callbacks.onToggle).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('returns cleanup function that removes listener', () => {
      cleanup = createKeyboardHandler(callbacks);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      expect(callbacks.onToggle).toHaveBeenCalledTimes(1);

      cleanup();
      cleanup = null; // prevent afterEach from calling again

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
      expect(callbacks.onToggle).toHaveBeenCalledTimes(1); // still 1, not called again
    });
  });
});
