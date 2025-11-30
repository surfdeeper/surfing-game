/**
 * Settings Model - Centralized toggle/settings management with localStorage persistence
 *
 * Features:
 * - Schema-based settings with types and defaults
 * - Schema versioning for migrations
 * - Consistent localStorage read/write
 * - Event dispatch integration
 */

// Current schema version - increment when adding/removing/changing settings
export const SETTINGS_VERSION = 1;

// Settings schema with types and defaults
export const SETTINGS_SCHEMA = {
  // Display toggles
  showBathymetry: { type: 'boolean', default: false, hotkey: 'b' },
  showSetWaves: { type: 'boolean', default: true, hotkey: 's' },
  showBackgroundWaves: { type: 'boolean', default: true, hotkey: 'g' },
  showFoamZones: { type: 'boolean', default: true, hotkey: 'f' },
  showFoamSamples: { type: 'boolean', default: false, hotkey: 'd' },
  showPlayer: { type: 'boolean', default: false, hotkey: 'p' },
  showAIPlayer: { type: 'boolean', default: false, hotkey: 'a' },

  // Experimental foam options
  showFoamOptionA: { type: 'boolean', default: false, hotkey: '1' },
  showFoamOptionB: { type: 'boolean', default: false, hotkey: '2' },
  showFoamOptionC: { type: 'boolean', default: false, hotkey: '3' },

  // Energy field
  showEnergyField: { type: 'boolean', default: false, hotkey: 'e' },
  depthDampingCoefficient: { type: 'number', default: 0.1 },
  depthDampingExponent: { type: 'number', default: 2.0 },

  // Time scale (not a toggle but a setting)
  timeScale: { type: 'number', default: 1, options: [1, 2, 4, 8] },
};

// localStorage key
const STORAGE_KEY = 'gameSettings';

/**
 * Get default settings from schema
 */
export function getDefaultSettings(): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const [key, schema] of Object.entries(SETTINGS_SCHEMA)) {
    defaults[key] = schema.default;
  }
  return defaults;
}

/**
 * Validate a value against its schema
 */
export function validateSetting(key, value) {
  const schema = SETTINGS_SCHEMA[key];
  if (!schema) {
    return { valid: false, error: `Unknown setting: ${key}` };
  }

  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    return { valid: false, error: `${key} must be a boolean` };
  }

  if (schema.type === 'number' && typeof value !== 'number') {
    return { valid: false, error: `${key} must be a number` };
  }

  if (schema.options && !schema.options.includes(value)) {
    return { valid: false, error: `${key} must be one of: ${schema.options.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Load settings from localStorage with schema migration
 */
export function loadSettings() {
  const defaults = getDefaultSettings();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaults;
    }

    const parsed = JSON.parse(stored);

    // Check schema version
    if (parsed._version !== SETTINGS_VERSION) {
      console.log(`Settings schema upgraded from v${parsed._version || 0} to v${SETTINGS_VERSION}`);
      // Future: add migration logic here
    }

    // Merge stored values with defaults (defaults fill in any missing keys)
    const settings = { ...defaults };
    for (const key of Object.keys(SETTINGS_SCHEMA)) {
      if (key in parsed && validateSetting(key, parsed[key]).valid) {
        settings[key] = parsed[key];
      }
    }

    return settings;
  } catch (e) {
    console.warn('Failed to load settings:', e);
    return defaults;
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings) {
  try {
    const toStore = {
      _version: SETTINGS_VERSION,
      ...settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

/**
 * Toggle a boolean setting
 */
export function toggleSetting(settings, key) {
  const schema = SETTINGS_SCHEMA[key];
  if (!schema || schema.type !== 'boolean') {
    console.warn(`Cannot toggle non-boolean setting: ${key}`);
    return settings;
  }

  const newSettings = {
    ...settings,
    [key]: !settings[key],
  };
  saveSettings(newSettings);
  return newSettings;
}

/**
 * Update a setting value
 */
export function updateSetting(settings, key, value) {
  const validation = validateSetting(key, value);
  if (!validation.valid) {
    console.warn(validation.error);
    return settings;
  }

  const newSettings = {
    ...settings,
    [key]: value,
  };
  saveSettings(newSettings);
  return newSettings;
}

/**
 * Cycle through options for a setting (e.g., timeScale: 1 -> 2 -> 4 -> 8 -> 1)
 */
export function cycleSetting(settings, key) {
  const schema = SETTINGS_SCHEMA[key];
  if (!schema || !schema.options) {
    console.warn(`Cannot cycle setting without options: ${key}`);
    return settings;
  }

  const currentIndex = schema.options.indexOf(settings[key]);
  const nextIndex = (currentIndex + 1) % schema.options.length;
  const newValue = schema.options[nextIndex];

  return updateSetting(settings, key, newValue);
}

/**
 * Get hotkey for a setting
 */
export function getHotkeyForSetting(key) {
  return SETTINGS_SCHEMA[key]?.hotkey || null;
}

/**
 * Get setting key for a hotkey
 */
export function getSettingForHotkey(hotkey) {
  const lowerHotkey = hotkey.toLowerCase();
  for (const [key, schema] of Object.entries(SETTINGS_SCHEMA)) {
    if ('hotkey' in schema && schema.hotkey === lowerHotkey) {
      return key;
    }
  }
  return null;
}

/**
 * Clear all saved settings (reset to defaults)
 */
export function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear settings:', e);
  }
  return getDefaultSettings();
}
