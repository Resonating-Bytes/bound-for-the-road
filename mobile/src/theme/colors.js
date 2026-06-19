/** Base palette — header colors overridden by theme preset. */
export const DEFAULT_COLORS = {
  screenBackground: '#f5f7fa',
  headerBackground: '#4a4a4a',
  headerBorder: '#383838',
  circleBackground: '#ffffff',
  circleBorder: '#cbd5e1',
  textPrimary: '#1a2b3c',
  textSecondary: '#5a6b7c',
  accent: '#2563eb',
  headerText: '#f8fafc',
  statusBarStyle: 'light',
};

/** @deprecated use useTheme() — kept for modules that load before ThemeProvider */
export const colors = DEFAULT_COLORS;
