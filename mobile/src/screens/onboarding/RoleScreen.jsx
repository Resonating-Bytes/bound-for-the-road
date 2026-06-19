import { View, Text, Pressable } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { shared } from './sharedStyles';

export function OnboardingRoleScreen({ navigation }) {
  const { saveRole } = useAuth();

  async function chooseRole(role) {
    await saveRole(role);
    navigation.replace(role === 'adult' ? 'OnboardingAdultName' : 'OnboardingName');
  }

  return (
    <Screen>
      <View style={shared.content}>
        <Text style={shared.title}>Who are you?</Text>
        <Text style={shared.hint}>This choice is saved to your account and cannot be changed later.</Text>

        <Pressable style={[shared.button, styles.choice]} onPress={() => chooseRole('teen')}>
          <Text style={shared.buttonText}>I&apos;m a teen driver</Text>
        </Pressable>

        <Pressable style={[shared.button, styles.choice]} onPress={() => chooseRole('adult')}>
          <Text style={shared.buttonText}>I&apos;m a supervising adult</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = {
  choice: {
    marginBottom: 12,
  },
};
