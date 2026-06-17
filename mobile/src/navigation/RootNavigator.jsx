import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { MockSignInScreen } from '../screens/MockSignInScreen';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { ready, userId, profileComplete } = useAuth();

  if (!ready) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </Screen>
    );
  }

  const initialRoute = !userId
    ? 'MockSignIn'
    : profileComplete
      ? 'Dashboard'
      : 'OnboardingName';

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MockSignIn" component={MockSignInScreen} />
        <Stack.Screen
          name="OnboardingName"
          getComponent={() => require('../screens/onboarding/NameScreen').OnboardingNameScreen}
        />
        <Stack.Screen
          name="OnboardingDOB"
          getComponent={() => require('../screens/onboarding/DOBScreen').OnboardingDOBScreen}
        />
        <Stack.Screen
          name="OnboardingState"
          getComponent={() => require('../screens/onboarding/StateScreen').OnboardingStateScreen}
        />
        <Stack.Screen
          name="OnboardingPermit"
          getComponent={() => require('../screens/onboarding/PermitDateScreen').OnboardingPermitScreen}
        />
        <Stack.Screen
          name="Dashboard"
          getComponent={() => require('../screens/DashboardScreen').DashboardScreen}
        />
        <Stack.Screen
          name="ActiveSession"
          getComponent={() => require('../screens/ActiveSessionScreen').ActiveSessionScreen}
        />
        <Stack.Screen
          name="ReviewSession"
          getComponent={() => require('../screens/ReviewSessionScreen').ReviewSessionScreen}
        />
        <Stack.Screen
          name="Settings"
          getComponent={() => require('../screens/SettingsScreen').SettingsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { justifyContent: 'center', alignItems: 'center' },
});
