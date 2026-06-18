import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { SignInScreen } from '../screens/SignInScreen';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Screen } from '../components/Screen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator({ profileComplete }) {
  const initialRoute = profileComplete ? 'Dashboard' : 'OnboardingName';

  return (
    <AppStack.Navigator
      key={profileComplete ? 'main' : 'onboarding'}
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <AppStack.Screen
        name="OnboardingName"
        getComponent={() => require('../screens/onboarding/NameScreen').OnboardingNameScreen}
      />
      <AppStack.Screen
        name="OnboardingDOB"
        getComponent={() => require('../screens/onboarding/DOBScreen').OnboardingDOBScreen}
      />
      <AppStack.Screen
        name="OnboardingState"
        getComponent={() => require('../screens/onboarding/StateScreen').OnboardingStateScreen}
      />
      <AppStack.Screen
        name="OnboardingPermit"
        getComponent={() => require('../screens/onboarding/PermitDateScreen').OnboardingPermitScreen}
      />
      <AppStack.Screen
        name="Dashboard"
        getComponent={() => require('../screens/DashboardScreen').DashboardScreen}
      />
      <AppStack.Screen
        name="ActiveSession"
        getComponent={() => require('../screens/ActiveSessionScreen').ActiveSessionScreen}
      />
      <AppStack.Screen
        name="ReviewSession"
        getComponent={() => require('../screens/ReviewSessionScreen').ReviewSessionScreen}
      />
      <AppStack.Screen
        name="Settings"
        getComponent={() => require('../screens/SettingsScreen').SettingsScreen}
      />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { ready, userId, profileComplete } = useAuth();

  if (!ready) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator size="large" color="#2563eb" />
      </Screen>
    );
  }

  return (
    <NavigationContainer>
      {userId ? <AppNavigator profileComplete={profileComplete} /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { justifyContent: 'center', alignItems: 'center' },
});
