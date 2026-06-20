import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { removeLink } from '../../lib/links';
import { removeUserNickname, saveUserNickname } from '../../lib/userAliases';
import { clampName, MAX_NICKNAME_LENGTH } from '../../utils/names';
import { useTheme } from '../../context/ThemeContext';

export function SettingsLinkedAccountDetailScreen({ route, navigation }) {
  const { partner } = route.params ?? {};
  const { user, refreshLinks } = useAuth();
  const { theme } = useTheme();
  const isTeen = user?.role === 'teen';

  const baseDisplay = partner?.displayName?.trim() ?? '';
  const savedNickname = partner?.nickname?.trim() || null;
  const initialField = savedNickname ?? baseDisplay;

  const [nickname, setNickname] = useState(initialField);
  const [busy, setBusy] = useState(false);
  const [removingLink, setRemovingLink] = useState(false);

  const trimmed = nickname.trim();
  const matchesDisplay = trimmed === baseDisplay;
  const matchesSavedNickname = savedNickname && trimmed === savedNickname;
  const clearedWithNickname = savedNickname && !trimmed;

  let saveDisabled = true;
  let saveLabel = 'Save nickname';

  if (clearedWithNickname) {
    saveDisabled = false;
    saveLabel = 'Remove nickname';
  } else if (savedNickname) {
    if (matchesSavedNickname || matchesDisplay) {
      saveDisabled = true;
    } else if (trimmed) {
      saveDisabled = false;
    }
  } else if (trimmed && !matchesDisplay) {
    saveDisabled = false;
  }

  async function handleSave() {
    if (!user?.id || !partner?.partnerId || saveDisabled) return;

    setBusy(true);
    try {
      if (clearedWithNickname || (savedNickname && matchesDisplay)) {
        await removeUserNickname(user.id, partner.partnerId);
      } else {
        await saveUserNickname(user.id, partner.partnerId, trimmed);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', e.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmRemoveLink() {
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
            setRemovingLink(true);
            try {
              await removeLink(partner.linkId);
              await refreshLinks();
              navigation.goBack();
            } catch (e) {
              Alert.alert('Could not remove link', e.message ?? 'Try again.');
            } finally {
              setRemovingLink(false);
            }
          },
        },
      ],
    );
  }

  if (!partner) {
    return (
      <Screen withHeader>
        <ScreenHeader title="Linked account" onBack={() => navigation.goBack()} />
        <Text style={styles.missing}>Account not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <ScreenHeader title="Account details" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Legal name</Text>
        <Text style={styles.legalName}>{partner.legalName}</Text>

        <Text style={styles.label}>Nickname</Text>
        <Text style={styles.hint}>
          The name you’ll see for them in the app{'\n'}(Only visible to you)
        </Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={(text) => setNickname(clampName(text, MAX_NICKNAME_LENGTH))}
          placeholder={baseDisplay || 'Nickname'}
          autoCapitalize="words"
        />

        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            (busy || saveDisabled) && styles.disabled,
          ]}
          onPress={handleSave}
          disabled={busy || saveDisabled}
        >
          {busy ? (
            <ActivityIndicator color={theme.accentText} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: theme.accentText }]}>{saveLabel}</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.dangerBtn, removingLink && styles.disabled]}
          onPress={confirmRemoveLink}
          disabled={removingLink}
        >
          {removingLink ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text style={styles.dangerBtnText}>Remove link</Text>
          )}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  missing: { padding: 20, fontSize: 16, color: '#6a7b8c' },
  label: { fontSize: 15, fontWeight: '600', color: '#1a2b3c', marginBottom: 6 },
  legalName: { fontSize: 16, color: '#1a2b3c', marginBottom: 24 },
  hint: { fontSize: 14, color: '#6a7b8c', marginBottom: 8, lineHeight: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  primaryBtnText: { fontWeight: '600', fontSize: 16 },
  dangerBtn: { paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.6 },
});
