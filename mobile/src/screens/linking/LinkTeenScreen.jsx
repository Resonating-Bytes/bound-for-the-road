import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Share, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { BackButton } from '../../components/BackButton';
import { setLinkInviteDeferred } from '../../db/queries';
import { createLinkInvite, formatInviteCode } from '../../lib/links';
import { canShowBackButton, navigateBackOrHome, resetToHome } from '../../navigation/helpers';
import { shared } from '../onboarding/sharedStyles';

export function LinkTeenScreen({ navigation }) {
  const { userId, user, linked, refreshLinks } = useAuth();
  const [code, setCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadInvite = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const invite = await createLinkInvite(userId);
      setCode(invite.code);
      setExpiresAt(invite.expires_at);
    } catch (e) {
      Alert.alert('Could not create code', e.message ?? 'Try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refreshLinks();
      if (!code) {
        loadInvite();
      }
    }, [refreshLinks, code, loadInvite]),
  );

  useEffect(() => {
    if (linked) return undefined;
    const timer = setInterval(() => {
      refreshLinks();
    }, 2000);
    return () => clearInterval(timer);
  }, [linked, refreshLinks]);

  useEffect(() => {
    if (!linked) return undefined;
    const timer = setTimeout(() => {
      resetToHome(navigation, 'teen');
    }, 0);
    return () => clearTimeout(timer);
  }, [linked, navigation]);

  async function handleCopy() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', 'Invite code copied to clipboard.');
  }

  async function handleShare() {
    if (!code) return;
    await Share.share({
      message: `Join me on Bound for the Road with invite code ${formatInviteCode(code)}`,
    });
  }

  function handleInviteLater() {
    if (userId) {
      setLinkInviteDeferred(userId, true);
    }
    navigation.navigate('Dashboard');
  }

  function handleBack() {
    navigateBackOrHome(navigation, { linked, role: user?.role ?? 'teen' });
  }

  return (
    <Screen>
      {canShowBackButton(navigation, linked) ? (
        <BackButton onPress={handleBack} />
      ) : null}
      <View style={[shared.content, styles.content]}>
        <Text style={shared.title}>Invite an adult</Text>
        <Text style={shared.hint}>
          Share this code with your supervising adult. It expires in 24 hours.
        </Text>

        <Text style={styles.code}>{code ? formatInviteCode(code) : loading ? '…' : '------'}</Text>

        <Pressable style={shared.button} onPress={handleCopy} disabled={!code}>
          <Text style={shared.buttonText}>Copy code</Text>
        </Pressable>

        <Pressable style={[shared.button, styles.secondary]} onPress={handleShare} disabled={!code}>
          <Text style={shared.buttonText}>Share code</Text>
        </Pressable>

        <Pressable style={styles.textButton} onPress={loadInvite} disabled={loading}>
          <Text style={styles.textButtonLabel}>Generate new code</Text>
        </Pressable>

        {expiresAt ? (
          <Text style={styles.meta}>Expires {new Date(expiresAt).toLocaleString()}</Text>
        ) : null}

        {linked ? (
          <Text style={styles.waiting}>Linked! Taking you to the dashboard…</Text>
        ) : (
          <View style={styles.skipSection}>
            <Text style={styles.waiting}>
              Waiting for your adult to enter this code in their app.
            </Text>
            <Pressable style={styles.skipBtn} onPress={handleInviteLater}>
              <Text style={styles.skipBtnText}>Invite later</Text>
            </Pressable>
            <Text style={styles.skipHint}>
              Start logging practice now. You can invite a supervising adult anytime from Settings.
            </Text>
          </View>
        )}

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 52,
  },
  code: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    color: '#1a2b3c',
    marginVertical: 24,
  },
  secondary: {
    marginTop: 12,
    backgroundColor: '#1d4ed8',
  },
  textButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  textButtonLabel: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    marginTop: 12,
    fontSize: 13,
    color: '#6a7b8c',
    textAlign: 'center',
  },
  waiting: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5a6b7c',
    textAlign: 'center',
  },
  skipSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  skipBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    minWidth: 200,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#1a2b3c',
    fontSize: 16,
    fontWeight: '600',
  },
  skipHint: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#6a7b8c',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
