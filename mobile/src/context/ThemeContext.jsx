import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { getSettingValue, setSettingValue } from '../db/queries';
import { DEFAULT_PRESET_ID, HEADER_THEME_PRESETS, getPresetById } from '../theme/presets';
import { resolveTheme } from '../theme/resolveTheme';

const THEME_SETTING_KEY = 'header_theme_id';

const ThemeContext = createContext(null);

function readSavedPresetId() {
  const saved = getSettingValue(THEME_SETTING_KEY);
  return getPresetById(saved) ? saved : DEFAULT_PRESET_ID;
}

export function ThemeProvider({ children }) {
  const [presetId, setPresetIdState] = useState(readSavedPresetId);

  const setPresetId = useCallback((id) => {
    if (!getPresetById(id)) return;
    setPresetIdState(id);
    setSettingValue(THEME_SETTING_KEY, id);
  }, []);

  const theme = useMemo(() => resolveTheme(presetId), [presetId]);
  const selectedPreset = useMemo(
    () => getPresetById(presetId) ?? getPresetById(DEFAULT_PRESET_ID),
    [presetId],
  );

  const value = useMemo(
    () => ({
      theme,
      presetId,
      selectedPreset,
      presets: HEADER_THEME_PRESETS,
      setPresetId,
    }),
    [theme, presetId, selectedPreset, setPresetId],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: resolveTheme(DEFAULT_PRESET_ID),
      presetId: DEFAULT_PRESET_ID,
      selectedPreset: getPresetById(DEFAULT_PRESET_ID),
      presets: HEADER_THEME_PRESETS,
      setPresetId: () => {},
    };
  }
  return ctx;
}

export function ThemeStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.statusBarStyle} />;
}
