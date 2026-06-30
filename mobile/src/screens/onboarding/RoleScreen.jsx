import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { useTheme } from '../../context/ThemeContext';
import { shared, themeAccentStyles } from './sharedStyles';

export function OnboardingRoleScreen({ navigation }) {
  const { saveRole } = useAuth();
  const { theme } = useTheme();
  const accent = themeAccentStyles(theme);

  async function chooseRole(role) {
    await saveRole(role);
    if (role === 'adult') {
      navigation.replace('OnboardingAdultName');
    } else if (role === 'instructor') {
      navigation.replace('OnboardingInstructorName');
    } else {
      navigation.replace('OnboardingName');
    }
  }

  return (
    <Screen>
      <View style={[shared.content, styles.root]}>
        <Text style={shared.title}>Who are you?</Text>
        <Text style={shared.hint}>This choice is saved to your account and cannot be changed later.</Text>

        <View style={styles.choices}>
          <Pressable
            style={[shared.button, accent.button, styles.choiceButton]}
            onPress={() => chooseRole('teen')}
          >
            <Text style={[shared.buttonText, accent.buttonText]}>I&apos;m a teen driver</Text>
          </Pressable>

          <Pressable
            style={[shared.button, accent.button, styles.choiceButton]}
            onPress={() => chooseRole('adult')}
          >
            <Text style={[shared.buttonText, accent.buttonText]}>I&apos;m a supervising adult</Text>
          </Pressable>

          <Pressable
            style={[shared.button, accent.button, styles.choiceButton]}
            onPress={() => chooseRole('instructor')}
          >
            <Text style={[shared.buttonText, accent.buttonText]}>I&apos;m a driving instructor</Text>
            <Text style={styles.choiceSubtitle}>Classroom or behind-the-wheel programs</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 8,
  },
  choices: {
    marginTop: 24,
    gap: 16,
  },
  choiceButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  choiceSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '400',
  },
});