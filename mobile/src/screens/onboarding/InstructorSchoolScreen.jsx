import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getInstructorSchoolCache } from '../../db/queries';
import { Screen } from '../../components/Screen';
import { formatInviteCode, normalizeInviteCode } from '../../lib/links';
import {
  affiliateInstructorWithLinkId,
  tryAutoAffiliateInstructor,
} from '../../lib/instructorSchool';
import { useTheme } from '../../context/ThemeContext';
import { shared, themeAccentStyles } from './sharedStyles';

export function OnboardingInstructorSchoolScreen() {
  const { completeInstructorSchoolOnboarding, userId } = useAuth();
  const { theme } = useTheme();
  const accent = themeAccentStyles(theme);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [affiliatedSchool, setAffiliatedSchool] = useState(null);

  const finishOnboarding = useCallback(() => {
    completeInstructorSchoolOnboarding();
  }, [completeInstructorSchoolOnboarding]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let school = await tryAutoAffiliateInstructor();
        if (cancelled) return;
        if (!school && userId) {
          const cached = getInstructorSchoolCache(userId);
          if (cached) {
            school = { schoolId: cached.schoolId, schoolName: cached.schoolName };
          }
        }
        if (school) {
          setAffiliatedSchool(school);
        }
      } catch {
        // User can enter code manually or skip
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [finishOnboarding, userId]);

  async function handleAffiliate() {
    const normalized = normalizeInviteCode(code);
    if (normalized.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-digit code from your driving school.');
      return;
    }

    setSubmitting(true);
    try {
      const school = await affiliateInstructorWithLinkId(normalized);
      setAffiliatedSchool(school);
    } catch (e) {
      Alert.alert('Could not link school', e.message ?? 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    finishOnboarding();
  }

  const codeComplete = code.length === 6;

  if (loading) {
    return (
      <Screen style={shared.centered}>
        <ActivityIndicator size="large" color={theme.accent} />
      </Screen>
    );
  }

  if (affiliatedSchool) {
    return (
      <Screen>
        <View style={shared.content}>
          <Text style={shared.title}>Linked to {affiliatedSchool.schoolName}</Text>
          <Text style={shared.hint}>You can link teen drivers from Settings when you are ready.</Text>
          <Pressable style={[shared.button, accent.button]} onPress={finishOnboarding}>
            <Text style={[shared.buttonText, accent.buttonText]}>Continue</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={shared.content}>
        <Text style={shared.title}>Link your driving school</Text>
        <Text style={shared.hint}>
          Enter the 6-digit school code from your driving school. If you are the school owner, we may
          link you automatically when your sign-in email matches.
        </Text>

        <Text style={shared.fieldLabel}>School code</Text>
        <TextInput
          style={[shared.input, styles.codeInput]}
          value={formatInviteCode(code)}
          onChangeText={(text) => setCode(normalizeInviteCode(text).slice(0, 6))}
          placeholder="847 291"
          keyboardType="number-pad"
          maxLength={7}
        />

        <Pressable
          style={[
            shared.button,
            accent.button,
            (!codeComplete || submitting) && shared.buttonDisabled,
          ]}
          onPress={handleAffiliate}
          disabled={!codeComplete || submitting}
        >
          <Text style={[shared.buttonText, accent.buttonText]}>
            {submitting ? 'Linking…' : 'Link school'}
          </Text>
        </Pressable>

        <Pressable style={shared.secondaryButton} onPress={handleSkip}>
          <Text style={shared.secondaryButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
  },
});
