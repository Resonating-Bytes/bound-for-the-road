import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  getActiveCompatibilityDisplay,
  getAppUpdateStatus,
  getCompatibilityStatusLabel,
} from '../lib/compatibility';
import { useCompatibility } from '../context/CompatibilityContext';
import { APP_VERSION } from '../config/compatibility';
import { openAppUpdateUrl } from './ScreenHeaderBanners';

export function AppVersionSection() {
  const { compatibility, loading, refresh } = useCompatibility();
  const active = getActiveCompatibilityDisplay(compatibility);
  const remote = compatibility.remote ?? active.remote;
  const statusSource = active.preview ? active : compatibility;
  const updateStatus = getAppUpdateStatus(remote);
  const showUpdateButton = updateStatus.required || updateStatus.optional;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>App version</Text>
      <Text style={styles.metaLine}>Installed: {APP_VERSION}</Text>
      {remote?.min_app_version ? (
        <Text style={styles.metaLine}>Server minimum: {remote.min_app_version}</Text>
      ) : null}
      {remote?.latest_app_version ? (
        <Text style={styles.metaLine}>Server latest: {remote.latest_app_version}</Text>
      ) : null}
      {remote?.backend_revision ? (
        <Text style={styles.metaLine}>Backend revision: {remote.backend_revision}</Text>
      ) : null}
      <Text style={styles.statusLine}>
        Status: {loading ? 'Checking…' : getCompatibilityStatusLabel(statusSource)}
      </Text>
      {compatibility.warning ? (
        <Text style={styles.warningLine}>Note: {compatibility.warning}</Text>
      ) : null}
      {showUpdateButton ? (
        <Pressable style={styles.updateBtn} onPress={openAppUpdateUrl}>
          <Text style={styles.updateBtnText}>
            {updateStatus.required ? 'Update required — get latest app' : 'Update available — get latest app'}
          </Text>
        </Pressable>
      ) : null}
      <Pressable onPress={refresh} accessibilityRole="button">
        <Text style={styles.refreshLink}>Re-check compatibility</Text>
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
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  updateBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  refreshLink: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
});
