import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLinkedPartners, removeLink } from '../lib/links';
import { useTheme } from '../context/ThemeContext';

export function LinkedAccountsSection({
  userId,
  role,
  refreshLinks,
  onInvite,
}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const { theme } = useTheme();

  const loadPartners = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await refreshLinks();
      const rows = await fetchLinkedPartners(userId);
      setPartners(rows);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [refreshLinks, userId]);

  useFocusEffect(
    useCallback(() => {
      loadPartners();
    }, [loadPartners]),
  );

  function confirmRemove(partner) {
    const isTeen = role === 'teen';
    Alert.alert(
      'Remove link?',
      isTeen
        ? `Stop sharing with ${partner.name}? They will no longer see your driving log.`
        : `Stop supervising ${partner.name}? You will no longer see their driving log.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(partner.linkId);
            try {
              await removeLink(partner.linkId);
              await refreshLinks();
              await loadPartners();
            } catch (e) {
              Alert.alert('Could not remove link', e.message ?? 'Try again.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  }

  const emptyLabel = role === 'teen' ? 'No linked adults yet.' : 'No linked teen drivers yet.';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Linked accounts</Text>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={theme.accent} />
      ) : partners.length ? (
        <View style={styles.list}>
          {partners.map((partner, index) => (
            <View
              key={partner.linkId}
              style={[styles.row, index === partners.length - 1 && styles.rowLast]}
            >
              <Text style={styles.name} numberOfLines={1}>
                {partner.name}
              </Text>
              <Pressable
                onPress={() => confirmRemove(partner)}
                disabled={removingId === partner.linkId}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${partner.name}`}
              >
                {removingId === partner.linkId ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Ionicons name="trash-outline" size={22} color="#dc2626" />
                )}
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>{emptyLabel}</Text>
      )}

      <Pressable style={styles.inviteBtn} onPress={onInvite}>
        <Text style={styles.inviteBtnText}>
          {role === 'teen' ? 'Invite adult' : 'Link another teen'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b3c',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 12,
  },
  list: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  name: {
    flex: 1,
    fontSize: 16,
    color: '#1a2b3c',
    marginRight: 12,
  },
  removeBtn: {
    padding: 4,
  },
  empty: {
    fontSize: 15,
    color: '#6a7b8c',
    marginBottom: 12,
  },
  inviteBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  inviteBtnText: {
    color: '#1a2b3c',
    fontWeight: '600',
    fontSize: 16,
  },
});
