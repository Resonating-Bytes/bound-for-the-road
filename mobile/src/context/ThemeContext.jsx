import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from './AuthContext';
import { DEFAULT_PRESET_ID, HEADER_THEME_PRESETS, getPresetById } from '../theme/presets';
import {
  readHeaderThemePresetId,
  registerHeaderThemeResetListener,
  writeHeaderThemePresetId,
} from '../theme/headerTheme';
import { resolveTheme } from '../theme/resolveTheme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { userId } = useAuth();
  const [presetId, setPresetIdState] = useState(DEFAULT_PRESET_ID);

  useEffect(() => {
    setPresetIdState(readHeaderThemePresetId(userId));
  }, [userId]);

  useEffect(() => registerHeaderThemeResetListener(setPresetIdState), []);

  const setPresetId = useCallback(
    (id) => {
      if (!userId || !getPresetById(id)) return;
      setPresetIdState(id);
      writeHeaderThemePresetId(userId, id);
    },
    [userId],
  );

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
