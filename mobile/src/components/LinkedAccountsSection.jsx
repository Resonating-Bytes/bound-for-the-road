import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchLinkedPartners } from '../lib/links';
import { ListRowChevron } from './ListRowChevron';
import { useTheme } from '../context/ThemeContext';
import { isInstructorRole } from '../utils/roles';

export function LinkedAccountsSection({
  userId,
  role,
  refreshLinks,
  onInvite,
  onPartnerPress,
  hideSectionTitle = false,
}) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const emptyLabel =
    role === 'teen' ? 'No linked adults yet.' : 'No linked teen drivers yet.';

  return (
    <View style={styles.section}>
      {hideSectionTitle ? null : <Text style={styles.sectionTitle}>Linked accounts</Text>}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={theme.accent} />
      ) : partners.length ? (
        <View style={styles.list}>
          {partners.map((partner, index) => (
            <Pressable
              key={partner.linkId}
              style={[styles.row, index === partners.length - 1 && styles.rowLast]}
              onPress={() => onPartnerPress?.(partner)}
              accessibilityRole="button"
              accessibilityLabel={`${partner.name}, ${partner.legalName}`}
            >
              <View style={styles.rowText}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {partner.name}
                  </Text>
                  {role === 'teen' && isInstructorRole(partner.partnerRole) ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Instructor</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.legalName} numberOfLines={1}>
                  {partner.legalName}
                </Text>
              </View>
              <ListRowChevron />
            </Pressable>
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
  rowText: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b3c',
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },
  legalName: {
    fontSize: 13,
    color: '#6a7b8c',
    marginTop: 2,
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
