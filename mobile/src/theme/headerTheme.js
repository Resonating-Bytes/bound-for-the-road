import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { settings } from '../db/schema';
import { getSettingValue, setSettingValue } from '../db/queries';
import { DEFAULT_PRESET_ID, getPresetById } from './presets';

/** Base name; persisted keys are per-user: `header_theme_id_<userId>`. */
export const HEADER_THEME_SETTING_NAME = 'header_theme_id';

const LEGACY_GLOBAL_THEME_KEY = HEADER_THEME_SETTING_NAME;

export function headerThemeSettingKey(userId) {
  return `${HEADER_THEME_SETTING_NAME}_${userId}`;
}

let resetListener = null;

export function registerHeaderThemeResetListener(listener) {
  resetListener = listener;
  return () => {
    resetListener = null;
  };
}

export function readHeaderThemePresetId(userId) {
  if (!userId) return DEFAULT_PRESET_ID;

  const key = headerThemeSettingKey(userId);
  let saved = getSettingValue(key);

  if (!saved) {
    const legacy = getSettingValue(LEGACY_GLOBAL_THEME_KEY);
    if (legacy && getPresetById(legacy)) {
      setSettingValue(key, legacy);
      getDb().delete(settings).where(eq(settings.key, LEGACY_GLOBAL_THEME_KEY)).run();
      saved = legacy;
    }
  }

  return getPresetById(saved) ? saved : DEFAULT_PRESET_ID;
}

export function writeHeaderThemePresetId(userId, presetId) {
  if (!userId || !getPresetById(presetId)) return;
  setSettingValue(headerThemeSettingKey(userId), presetId);
}

/** Remove saved header theme for one user and reset in-memory UI if listening. */
export function clearHeaderThemePreference(userId) {
  if (!userId) return;
  getDb()
    .delete(settings)
    .where(eq(settings.key, headerThemeSettingKey(userId)))
    .run();
  resetListener?.(DEFAULT_PRESET_ID);
}
