/**
 * Keyboard Handler - Game hotkey handling
 *
 * Handles:
 * - Toggle hotkeys (mapped via settings schema)
 * - Time scale cycling
 * - AI mode cycling
 */

import { getSettingForHotkey, SETTINGS_SCHEMA } from '../state/settingsModel.js';

// Get time scales from schema (default: [1, 2, 4, 8])
const TIME_SCALES = SETTINGS_SCHEMA.timeScale?.options || [1, 2, 4, 8];

/**
 * Create keyboard handler
 * @param {object} callbacks - Handler callbacks
 * @param {function} callbacks.onToggle - Called with (key) when toggle pressed
 * @param {function} callbacks.onTimeScaleChange - Called with (newScale) when T pressed
 * @param {function} callbacks.onAIModeChange - Called when M pressed
 * @param {function} callbacks.getToggles - Returns current toggle state
 * @param {function} callbacks.getTimeScale - Returns current time scale
 * @returns {function} Cleanup function to remove event listener
 */
export function createKeyboardHandler(callbacks) {
    const {
        onToggle,
        onTimeScaleChange,
        onAIModeChange,
        getToggles,
        getTimeScale,
    } = callbacks;

    function handleKeydown(e) {
        const key = e.key.toLowerCase();

        // Special case: 't' cycles timeScale
        if (key === 't') {
            const currentScale = getTimeScale();
            const currentIdx = TIME_SCALES.indexOf(currentScale);
            const nextScale = TIME_SCALES[(currentIdx + 1) % TIME_SCALES.length];
            onTimeScaleChange(nextScale);
            return;
        }

        // Special case: 'm' cycles AI mode (not in settings)
        if (key === 'm') {
            const toggles = getToggles();
            if (toggles.showPlayer && toggles.showAIPlayer) {
                onAIModeChange();
            }
            return;
        }

        // Special case: 'a' only toggles AI if player is enabled
        if (key === 'a') {
            if (getToggles().showPlayer) {
                onToggle('showAIPlayer');
            }
            return;
        }

        // General case: look up setting by hotkey from schema
        const settingKey = getSettingForHotkey(key);
        if (settingKey && SETTINGS_SCHEMA[settingKey]?.type === 'boolean') {
            onToggle(settingKey);
        }
    }

    document.addEventListener('keydown', handleKeydown);

    // Return cleanup function
    return () => document.removeEventListener('keydown', handleKeydown);
}
