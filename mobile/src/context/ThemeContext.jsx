import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from './AuthContext';
import { CUSTOM_PRESET_ID, customColorsFromPreset, isValidCustomThemeColors, sanitizeHexInput } from '../theme/customTheme';
import { DEFAULT_PRESET_ID, HEADER_THEME_PRESETS, getPresetById } from '../theme/presets';
import {
  readCustomThemeColors,
  readHeaderThemePresetId,
  registerHeaderThemeResetListener,
  writeCustomThemeColors,
  writeHeaderThemePresetId,
} from '../theme/headerTheme';
import { resolveTheme } from '../theme/resolveTheme';

const ThemeContext = createContext(null);

function isSelectablePresetId(id) {
  return id === CUSTOM_PRESET_ID || Boolean(getPresetById(id));
}

export function ThemeProvider({ children }) {
  const { userId } = useAuth();
  const [presetId, setPresetIdState] = useState(DEFAULT_PRESET_ID);
  const [customColors, setCustomColorsState] = useState(() => readCustomThemeColors(null));

  useEffect(() => {
    setPresetIdState(readHeaderThemePresetId(userId));
    setCustomColorsState(readCustomThemeColors(userId));
  }, [userId]);

  useEffect(() => registerHeaderThemeResetListener(setPresetIdState), []);

  const persistCustomColors = useCallback(
    (updater) => {
      setCustomColorsState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (userId) writeCustomThemeColors(userId, next);
        return next;
      });
    },
    [userId],
  );

  const setCustomPrimary = useCallback(
    (value) => {
      persistCustomColors((prev) => ({
        ...prev,
        primary: sanitizeHexInput(value),
      }));
    },
    [persistCustomColors],
  );

  const setCustomAccent = useCallback(
    (value) => {
      persistCustomColors((prev) => ({
        ...prev,
        accent: sanitizeHexInput(value),
      }));
    },
    [persistCustomColors],
  );

  const setPresetId = useCallback(
    (id) => {
      if (!userId || !isSelectablePresetId(id)) return;
      setPresetIdState(id);
      writeHeaderThemePresetId(userId, id);
    },
    [userId],
  );

  const selectCustomTheme = useCallback(() => {
    if (!userId || !isValidCustomThemeColors(customColors)) return;
    setPresetId(CUSTOM_PRESET_ID);
  }, [customColors, setPresetId, userId]);

  const copyPresetToCustom = useCallback(() => {
    if (!userId || presetId === CUSTOM_PRESET_ID) return;
    const preset = getPresetById(presetId);
    const colors = customColorsFromPreset(preset);
    if (!colors || !isValidCustomThemeColors(colors)) return;
    setCustomColorsState(colors);
    writeCustomThemeColors(userId, colors);
    setPresetIdState(CUSTOM_PRESET_ID);
    writeHeaderThemePresetId(userId, CUSTOM_PRESET_ID);
  }, [presetId, userId]);

  const canCopyPresetToCustom = presetId !== CUSTOM_PRESET_ID && Boolean(getPresetById(presetId));

  const theme = useMemo(() => resolveTheme(presetId, customColors), [presetId, customColors]);
  const selectedPreset = useMemo(() => {
    if (presetId === CUSTOM_PRESET_ID) return null;
    return getPresetById(presetId) ?? getPresetById(DEFAULT_PRESET_ID);
  }, [presetId]);

  const value = useMemo(
    () => ({
      theme,
      presetId,
      selectedPreset,
      presets: HEADER_THEME_PRESETS,
      customColors,
      setPresetId,
      setCustomPrimary,
      setCustomAccent,
      selectCustomTheme,
      copyPresetToCustom,
      canCopyPresetToCustom,
    }),
    [
      theme,
      presetId,
      selectedPreset,
      customColors,
      setPresetId,
      setCustomPrimary,
      setCustomAccent,
      selectCustomTheme,
      copyPresetToCustom,
      canCopyPresetToCustom,
    ],
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
      customColors: readCustomThemeColors(null),
      setPresetId: () => {},
      setCustomPrimary: () => {},
      setCustomAccent: () => {},
      selectCustomTheme: () => {},
      copyPresetToCustom: () => {},
      canCopyPresetToCustom: false,
    };
  }
  return ctx;
}

export function ThemeStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.statusBarStyle} />;
}
