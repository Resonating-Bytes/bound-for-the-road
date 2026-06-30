import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import { SignInScreen } from '../screens/auth/SignInScreen';

import { ActivityIndicator, StyleSheet } from 'react-native';

import { Screen } from '../components/Screen';

import { getInitialMainRoute, getMainNavigatorKey, getSetupInitialRoute } from './helpers';
import { isLinkInviteDeferred } from '../db/queries';
import { navigationRef } from './navigationRef';
import { PushNotificationHandler } from './PushNotificationHandler';



const AuthStack = createNativeStackNavigator();

const SetupStack = createNativeStackNavigator();

const TeenStack = createNativeStackNavigator();

const AdultStack = createNativeStackNavigator();

const InstructorStack = createNativeStackNavigator();
function AuthNavigator({ initialRouteName = 'SignIn' }) {

  return (

    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>

      <AuthStack.Screen name="SignIn" component={SignInScreen} />

      <AuthStack.Screen
        name="Register"
        getComponent={() => require('../screens/auth/RegisterScreen').RegisterScreen}
      />

      <AuthStack.Screen
        name="ForgotPassword"
        getComponent={() => require('../screens/auth/ForgotPasswordScreen').ForgotPasswordScreen}
      />

      <AuthStack.Screen
        name="ResetPassword"
        getComponent={() => require('../screens/auth/ResetPasswordScreen').ResetPasswordScreen}
      />

    </AuthStack.Navigator>

  );

}



function SetupNavigator({ initialRouteName }) {
  return (
    <SetupStack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >

      <SetupStack.Screen

        name="OnboardingRole"

        getComponent={() => require('../screens/onboarding/RoleScreen').OnboardingRoleScreen}

      />

      <SetupStack.Screen

        name="OnboardingName"

        getComponent={() => require('../screens/onboarding/NameScreen').OnboardingNameScreen}

      />

      <SetupStack.Screen

        name="OnboardingAdultName"

        getComponent={() => require('../screens/onboarding/AdultNameScreen').OnboardingAdultNameScreen}

      />

      <SetupStack.Screen
        name="OnboardingInstructorName"
        getComponent={() =>
          require('../screens/onboarding/InstructorNameScreen').OnboardingInstructorNameScreen
        }
      />

      <SetupStack.Screen
        name="OnboardingInstructorSchool"
        getComponent={() =>
          require('../screens/onboarding/InstructorSchoolScreen').OnboardingInstructorSchoolScreen
        }
      />

      <SetupStack.Screen

        name="OnboardingDOB"

        getComponent={() => require('../screens/onboarding/DOBScreen').OnboardingDOBScreen}

      />

      <SetupStack.Screen

        name="OnboardingState"

        getComponent={() => require('../screens/onboarding/StateScreen').OnboardingStateScreen}

      />

      <SetupStack.Screen

        name="OnboardingPermit"

        getComponent={() => require('../screens/onboarding/PermitDateScreen').OnboardingPermitScreen}

      />

    </SetupStack.Navigator>

  );

}



function TeenNavigator({ navigatorKey, initialRouteName }) {

  return (

    <TeenStack.Navigator

      key={navigatorKey}

      initialRouteName={initialRouteName}

      screenOptions={{ headerShown: false }}

    >

      <TeenStack.Screen

        name="Dashboard"

        getComponent={() => require('../screens/DashboardScreen').DashboardScreen}

      />

      <TeenStack.Screen

        name="LinkTeen"

        getComponent={() => require('../screens/linking/LinkTeenScreen').LinkTeenScreen}

      />

      <TeenStack.Screen

        name="ActiveSession"

        getComponent={() => require('../screens/ActiveSessionScreen').ActiveSessionScreen}

      />

      <TeenStack.Screen

        name="ReviewSession"

        getComponent={() => require('../screens/ReviewSessionScreen').ReviewSessionScreen}

      />

      <TeenStack.Screen

        name="Settings"

        getComponent={() => require('../screens/SettingsScreen').SettingsScreen}

      />

      <TeenStack.Screen
        name="SettingsProfile"
        getComponent={() => require('../screens/settings/SettingsProfileScreen').SettingsProfileScreen}
      />

      <TeenStack.Screen
        name="SettingsAppearance"
        getComponent={() => require('../screens/settings/SettingsAppearanceScreen').SettingsAppearanceScreen}
      />

      <TeenStack.Screen
        name="SettingsAppUpdates"
        getComponent={() => require('../screens/settings/SettingsAppUpdatesScreen').SettingsAppUpdatesScreen}
      />

      <TeenStack.Screen
        name="SettingsLinkedAccounts"
        getComponent={() => require('../screens/settings/SettingsLinkedAccountsScreen').SettingsLinkedAccountsScreen}
      />

      <TeenStack.Screen
        name="SettingsLinkedAccountDetail"
        getComponent={() =>
          require('../screens/settings/SettingsLinkedAccountDetailScreen').SettingsLinkedAccountDetailScreen
        }
      />

    </TeenStack.Navigator>

  );

}



function AdultNavigator({ navigatorKey, initialRouteName }) {

  return (

    <AdultStack.Navigator

      key={navigatorKey}

      initialRouteName={initialRouteName}

      screenOptions={{ headerShown: false }}

    >

      <AdultStack.Screen

        name="AdultHome"

        getComponent={() => require('../screens/AdultHomeScreen').AdultHomeScreen}

      />

      <AdultStack.Screen

        name="ApproveSession"

        getComponent={() => require('../screens/ApproveSessionScreen').ApproveSessionScreen}

      />

      <AdultStack.Screen

        name="LinkAdult"

        getComponent={() => require('../screens/linking/LinkAdultScreen').LinkAdultScreen}

      />

      <AdultStack.Screen

        name="Settings"

        getComponent={() => require('../screens/SettingsScreen').SettingsScreen}

      />

      <AdultStack.Screen
        name="SettingsProfile"
        getComponent={() => require('../screens/settings/SettingsProfileScreen').SettingsProfileScreen}
      />

      <AdultStack.Screen
        name="SettingsAppearance"
        getComponent={() => require('../screens/settings/SettingsAppearanceScreen').SettingsAppearanceScreen}
      />

      <AdultStack.Screen
        name="SettingsAppUpdates"
        getComponent={() => require('../screens/settings/SettingsAppUpdatesScreen').SettingsAppUpdatesScreen}
      />

      <AdultStack.Screen
        name="SettingsLinkedAccounts"
        getComponent={() => require('../screens/settings/SettingsLinkedAccountsScreen').SettingsLinkedAccountsScreen}
      />

      <AdultStack.Screen
        name="SettingsLinkedAccountDetail"
        getComponent={() =>
          require('../screens/settings/SettingsLinkedAccountDetailScreen').SettingsLinkedAccountDetailScreen
        }
      />

    </AdultStack.Navigator>

  );

}



function InstructorNavigator({ navigatorKey, initialRouteName }) {
  return (
    <InstructorStack.Navigator
      key={navigatorKey}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <InstructorStack.Screen
        name="InstructorHome"
        getComponent={() => require('../screens/InstructorHomeScreen').InstructorHomeScreen}
      />

      <InstructorStack.Screen
        name="ApproveSession"
        getComponent={() => require('../screens/ApproveSessionScreen').ApproveSessionScreen}
      />

      <InstructorStack.Screen
        name="LinkAdult"
        getComponent={() => require('../screens/linking/LinkAdultScreen').LinkAdultScreen}
      />

      <InstructorStack.Screen
        name="Settings"
        getComponent={() => require('../screens/SettingsScreen').SettingsScreen}
      />

      <InstructorStack.Screen
        name="SettingsProfile"
        getComponent={() => require('../screens/settings/SettingsProfileScreen').SettingsProfileScreen}
      />

      <InstructorStack.Screen
        name="SettingsAppearance"
        getComponent={() =>
          require('../screens/settings/SettingsAppearanceScreen').SettingsAppearanceScreen
        }
      />

      <InstructorStack.Screen
        name="SettingsAppUpdates"
        getComponent={() =>
          require('../screens/settings/SettingsAppUpdatesScreen').SettingsAppUpdatesScreen
        }
      />

      <InstructorStack.Screen
        name="SettingsLinkedAccounts"
        getComponent={() =>
          require('../screens/settings/SettingsLinkedAccountsScreen').SettingsLinkedAccountsScreen
        }
      />

      <InstructorStack.Screen
        name="SettingsLinkedAccountDetail"
        getComponent={() =>
          require('../screens/settings/SettingsLinkedAccountDetailScreen').SettingsLinkedAccountDetailScreen
        }
      />
    </InstructorStack.Navigator>
  );
}



export function RootNavigator() {
  const { ready, userId, user, roleChosen, profileComplete, linked, requiresLink, passwordRecoveryPending } =
    useAuth();
  const { theme } = useTheme();

  if (!ready) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator size="large" color={theme.accent} />
      </Screen>
    );
  }

  let containerKey = 'auth';
  let content = null;
  let showPushHandler = false;

  if (!userId) {
    const authInitial = passwordRecoveryPending ? 'ResetPassword' : 'SignIn';
    content = <AuthNavigator key={authInitial} initialRouteName={authInitial} />;
  } else if (!roleChosen || !profileComplete) {
    containerKey = `setup-${userId}`;
    const setupInitial = roleChosen && user?.role ? getSetupInitialRoute(user) : 'OnboardingRole';
    content = <SetupNavigator key={containerKey} initialRouteName={setupInitial} />;
  } else {
    const linkInviteDeferred = isLinkInviteDeferred(userId);
    const initialRouteName = getInitialMainRoute({
      role: user?.role,
      requiresLink,
      linked,
      linkInviteDeferred,
    });
    containerKey = getMainNavigatorKey({
      role: user?.role,
      requiresLink,
      linked,
      linkInviteDeferred,
    });
    content =
      user?.role === 'instructor' ? (
        <InstructorNavigator navigatorKey={containerKey} initialRouteName={initialRouteName} />
      ) : user?.role === 'adult' ? (
        <AdultNavigator navigatorKey={containerKey} initialRouteName={initialRouteName} />
      ) : (
        <TeenNavigator navigatorKey={containerKey} initialRouteName={initialRouteName} />
      );
    showPushHandler = true;
  }

  return (
    <NavigationContainer ref={navigationRef} key={containerKey}>
      {content}
      {showPushHandler && userId ? (
        <PushNotificationHandler userId={userId} role={user?.role} />
      ) : null}
    </NavigationContainer>
  );
}



const styles = StyleSheet.create({

  loading: { justifyContent: 'center', alignItems: 'center' },

});


