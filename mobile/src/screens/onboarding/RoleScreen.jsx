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
    navigation.replace(role === 'adult' ? 'OnboardingAdultName' : 'OnboardingName');
  }

  return (
    <Screen>
      <View style={[shared.content, styles.root]}>
        <Text style={shared.title}>Who are you?</Text>
        <Text style={shared.hint}>This choice is saved to your account and cannot be changed later.</Text>

        <View style={styles.choicesLayer} pointerEvents="box-none">
          <View style={[styles.choiceSlot, styles.teenSlot]}>
            <Pressable
              style={[shared.button, accent.button, styles.choiceButton]}
              onPress={() => chooseRole('teen')}
            >
              <Text style={[shared.buttonText, accent.buttonText]}>I&apos;m a teen driver</Text>
            </Pressable>
          </View>

          <View style={[styles.choiceSlot, styles.adultSlot]}>
            <Pressable
              style={[shared.button, accent.button, styles.choiceButton]}
              onPress={() => chooseRole('adult')}
            >
              <Text style={[shared.buttonText, accent.buttonText]}>I&apos;m a supervising adult</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  choicesLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  choiceSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  teenSlot: {
    top: '28%',
  },
  adultSlot: {
    top: '56%',
  },
  choiceButton: {
    width: 280,
    maxWidth: '78%',
  },
});
