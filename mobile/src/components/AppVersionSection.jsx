import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  getActiveCompatibilityDisplay,
  getAppUpdateStatus,
  getSettingsCompatibilityLabel,
} from '../lib/compatibility';
import { useCompatibility } from '../context/CompatibilityContext';
import { APP_VERSION } from '../config/compatibility';
import { openAppUpdateUrl } from './ScreenHeaderBanners';
import { useTheme } from '../context/ThemeContext';

export function AppVersionSection({ hideSectionTitle = false }) {
  const { theme } = useTheme();
  const { compatibility, loading, refresh } = useCompatibility();
  const active = getActiveCompatibilityDisplay(compatibility);
  const remote = compatibility.remote ?? active.remote;
  const statusSource = active.preview ? active : compatibility;
  const updateStatus = getAppUpdateStatus(remote);
  const showUpdateButton = updateStatus.required || updateStatus.optional;

  return (
    <View style={styles.section}>
      {hideSectionTitle ? null : <Text style={styles.sectionTitle}>App Updates</Text>}
      <Text style={styles.metaLine}>This device: {APP_VERSION}</Text>
      {updateStatus.required && remote?.min_app_version ? (
        <Text style={styles.metaLine}>Required version: {remote.min_app_version}</Text>
      ) : null}
      {updateStatus.optional && remote?.latest_app_version ? (
        <Text style={styles.metaLine}>Latest version: {remote.latest_app_version}</Text>
      ) : null}
      <Text style={styles.statusLine}>
        {loading ? 'Checking…' : getSettingsCompatibilityLabel(statusSource)}
      </Text>
      {compatibility.warning ? (
        <Text style={styles.warningLine}>{compatibility.warning}</Text>
      ) : null}
      {showUpdateButton ? (
        <Pressable style={[styles.updateBtn, { backgroundColor: theme.accent }]} onPress={openAppUpdateUrl}>
          <Text style={[styles.updateBtnText, { color: theme.accentText }]}>
            {updateStatus.required ? 'Get the latest app' : 'Get the update'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable onPress={refresh} accessibilityRole="button">
        <Text style={[styles.refreshLink, { color: theme.accent }]}>Check for updates</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b3c',
    marginBottom: 8,
  },
  metaLine: { fontSize: 14, color: '#5a6b7c', marginBottom: 4 },
  statusLine: { fontSize: 14, color: '#1a2b3c', marginTop: 6, marginBottom: 4 },
  warningLine: { fontSize: 13, color: '#b45309', marginBottom: 8 },
  updateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  updateBtnText: { fontWeight: '600', fontSize: 15 },
  refreshLink: { fontWeight: '600', fontSize: 14 },
});
