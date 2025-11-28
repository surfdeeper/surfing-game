import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    SETTINGS_SCHEMA,
    SETTINGS_VERSION,
    getDefaultSettings,
    validateSetting,
    loadSettings,
    saveSettings,
    toggleSetting,
    updateSetting,
    cycleSetting,
    getHotkeyForSetting,
    getSettingForHotkey,
    clearSettings,
} from './settingsModel.js';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value; }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        _getStore: () => store,
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('settingsModel', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('SETTINGS_SCHEMA', () => {
        it('has all required toggle settings', () => {
            expect(SETTINGS_SCHEMA.showBathymetry).toBeDefined();
            expect(SETTINGS_SCHEMA.showSetWaves).toBeDefined();
            expect(SETTINGS_SCHEMA.showBackgroundWaves).toBeDefined();
            expect(SETTINGS_SCHEMA.showFoamZones).toBeDefined();
            expect(SETTINGS_SCHEMA.showPlayer).toBeDefined();
        });

        it('has timeScale with options', () => {
            expect(SETTINGS_SCHEMA.timeScale.type).toBe('number');
            expect(SETTINGS_SCHEMA.timeScale.options).toEqual([1, 2, 4, 8]);
        });

        it('each setting has a type and default', () => {
            for (const [key, schema] of Object.entries(SETTINGS_SCHEMA)) {
                expect(schema.type).toBeDefined();
                expect(schema.default).toBeDefined();
            }
        });
    });

    describe('getDefaultSettings', () => {
        it('returns object with all settings', () => {
            const defaults = getDefaultSettings();

            expect(Object.keys(defaults)).toHaveLength(Object.keys(SETTINGS_SCHEMA).length);
        });

        it('uses schema defaults', () => {
            const defaults = getDefaultSettings();

            expect(defaults.showBathymetry).toBe(false);
            expect(defaults.showSetWaves).toBe(true);
            expect(defaults.timeScale).toBe(1);
        });
    });

    describe('validateSetting', () => {
        it('validates boolean settings', () => {
            expect(validateSetting('showBathymetry', true).valid).toBe(true);
            expect(validateSetting('showBathymetry', false).valid).toBe(true);
            expect(validateSetting('showBathymetry', 'true').valid).toBe(false);
        });

        it('validates number settings', () => {
            expect(validateSetting('timeScale', 1).valid).toBe(true);
            expect(validateSetting('timeScale', '1').valid).toBe(false);
        });

        it('validates options', () => {
            expect(validateSetting('timeScale', 1).valid).toBe(true);
            expect(validateSetting('timeScale', 4).valid).toBe(true);
            expect(validateSetting('timeScale', 3).valid).toBe(false); // Not in options
        });

        it('rejects unknown settings', () => {
            expect(validateSetting('unknownSetting', true).valid).toBe(false);
        });
    });

    describe('loadSettings', () => {
        it('returns defaults when no stored data', () => {
            const settings = loadSettings();

            expect(settings.showBathymetry).toBe(false);
            expect(settings.showSetWaves).toBe(true);
        });

        it('loads stored values', () => {
            localStorageMock.setItem('gameSettings', JSON.stringify({
                _version: SETTINGS_VERSION,
                showBathymetry: true,
                showSetWaves: false,
            }));

            const settings = loadSettings();

            expect(settings.showBathymetry).toBe(true);
            expect(settings.showSetWaves).toBe(false);
        });

        it('fills missing keys with defaults', () => {
            localStorageMock.setItem('gameSettings', JSON.stringify({
                _version: SETTINGS_VERSION,
                showBathymetry: true,
                // showSetWaves intentionally missing
            }));

            const settings = loadSettings();

            expect(settings.showBathymetry).toBe(true);
            expect(settings.showSetWaves).toBe(true); // Default
        });

        it('ignores invalid stored values', () => {
            localStorageMock.setItem('gameSettings', JSON.stringify({
                _version: SETTINGS_VERSION,
                showBathymetry: 'not a boolean',
                showSetWaves: true,
            }));

            const settings = loadSettings();

            expect(settings.showBathymetry).toBe(false); // Default because invalid
            expect(settings.showSetWaves).toBe(true);
        });

        it('handles corrupted JSON', () => {
            localStorageMock.setItem('gameSettings', 'not valid json');

            const settings = loadSettings();

            expect(settings).toEqual(getDefaultSettings());
        });
    });

    describe('saveSettings', () => {
        it('saves settings with version', () => {
            const settings = { showBathymetry: true, timeScale: 2 };
            saveSettings(settings);

            const stored = JSON.parse(localStorageMock._getStore()['gameSettings']);
            expect(stored._version).toBe(SETTINGS_VERSION);
            expect(stored.showBathymetry).toBe(true);
            expect(stored.timeScale).toBe(2);
        });
    });

    describe('toggleSetting', () => {
        it('toggles boolean setting', () => {
            const settings = getDefaultSettings();
            expect(settings.showBathymetry).toBe(false);

            const newSettings = toggleSetting(settings, 'showBathymetry');
            expect(newSettings.showBathymetry).toBe(true);

            const finalSettings = toggleSetting(newSettings, 'showBathymetry');
            expect(finalSettings.showBathymetry).toBe(false);
        });

        it('returns unchanged settings for non-boolean', () => {
            const settings = getDefaultSettings();
            const newSettings = toggleSetting(settings, 'timeScale');

            expect(newSettings.timeScale).toBe(settings.timeScale);
        });

        it('saves to localStorage', () => {
            const settings = getDefaultSettings();
            toggleSetting(settings, 'showBathymetry');

            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('updateSetting', () => {
        it('updates valid setting', () => {
            const settings = getDefaultSettings();
            const newSettings = updateSetting(settings, 'timeScale', 4);

            expect(newSettings.timeScale).toBe(4);
        });

        it('rejects invalid value', () => {
            const settings = getDefaultSettings();
            const newSettings = updateSetting(settings, 'timeScale', 3); // Not in options

            expect(newSettings.timeScale).toBe(1); // Unchanged
        });

        it('saves to localStorage', () => {
            const settings = getDefaultSettings();
            updateSetting(settings, 'timeScale', 2);

            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe('cycleSetting', () => {
        it('cycles through options', () => {
            let settings = getDefaultSettings();
            expect(settings.timeScale).toBe(1);

            settings = cycleSetting(settings, 'timeScale');
            expect(settings.timeScale).toBe(2);

            settings = cycleSetting(settings, 'timeScale');
            expect(settings.timeScale).toBe(4);

            settings = cycleSetting(settings, 'timeScale');
            expect(settings.timeScale).toBe(8);

            settings = cycleSetting(settings, 'timeScale');
            expect(settings.timeScale).toBe(1); // Wraps around
        });

        it('returns unchanged for settings without options', () => {
            const settings = getDefaultSettings();
            const newSettings = cycleSetting(settings, 'showBathymetry');

            expect(newSettings.showBathymetry).toBe(settings.showBathymetry);
        });
    });

    describe('hotkey mapping', () => {
        it('gets hotkey for setting', () => {
            expect(getHotkeyForSetting('showBathymetry')).toBe('b');
            expect(getHotkeyForSetting('showPlayer')).toBe('p');
            expect(getHotkeyForSetting('showFoamOptionA')).toBe('1');
        });

        it('returns null for unknown setting', () => {
            expect(getHotkeyForSetting('unknownSetting')).toBeNull();
        });

        it('gets setting for hotkey', () => {
            expect(getSettingForHotkey('b')).toBe('showBathymetry');
            expect(getSettingForHotkey('B')).toBe('showBathymetry'); // Case insensitive
            expect(getSettingForHotkey('p')).toBe('showPlayer');
        });

        it('returns null for unknown hotkey', () => {
            expect(getSettingForHotkey('z')).toBeNull();
        });
    });

    describe('clearSettings', () => {
        it('removes from localStorage', () => {
            saveSettings({ showBathymetry: true });
            clearSettings();

            expect(localStorageMock.removeItem).toHaveBeenCalledWith('gameSettings');
        });

        it('returns defaults', () => {
            const settings = clearSettings();

            expect(settings).toEqual(getDefaultSettings());
        });
    });
});
