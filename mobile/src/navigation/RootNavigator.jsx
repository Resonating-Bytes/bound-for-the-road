import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';

import { SignInScreen } from '../screens/SignInScreen';

import { ActivityIndicator, StyleSheet } from 'react-native';

import { Screen } from '../components/Screen';

import { getInitialMainRoute, getMainNavigatorKey } from './helpers';
import { isLinkInviteDeferred } from '../db/queries';



const AuthStack = createNativeStackNavigator();

const SetupStack = createNativeStackNavigator();

const TeenStack = createNativeStackNavigator();

const AdultStack = createNativeStackNavigator();



function AuthNavigator() {

  return (

    <AuthStack.Navigator screenOptions={{ headerShown: false }}>

      <AuthStack.Screen name="SignIn" component={SignInScreen} />

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

        name="LinkAdult"

        getComponent={() => require('../screens/linking/LinkAdultScreen').LinkAdultScreen}

      />

      <AdultStack.Screen

        name="Settings"

        getComponent={() => require('../screens/SettingsScreen').SettingsScreen}

      />

    </AdultStack.Navigator>

  );

}



export function RootNavigator() {

  const { ready, userId, user, roleChosen, profileComplete, linked, requiresLink } = useAuth();



  if (!ready) {

    return (

      <Screen style={styles.loading}>

        <ActivityIndicator size="large" color="#2563eb" />

      </Screen>

    );

  }



  if (!userId) {

    return (

      <NavigationContainer>

        <AuthNavigator />

      </NavigationContainer>

    );

  }



  if (!roleChosen || !profileComplete) {
    const setupInitial =
      roleChosen && user?.role
        ? user.role === 'adult'
          ? 'OnboardingAdultName'
          : 'OnboardingName'
        : 'OnboardingRole';

    return (
      <NavigationContainer>
        <SetupNavigator key={`setup-${userId}`} initialRouteName={setupInitial} />
      </NavigationContainer>
    );
  }



  const linkInviteDeferred = userId ? isLinkInviteDeferred(userId) : false;

  const initialRouteName = getInitialMainRoute({

    role: user?.role,

    requiresLink,

    linked,

    linkInviteDeferred,

  });

  const navigatorKey = getMainNavigatorKey({

    role: user?.role,

    requiresLink,

    linked,

    linkInviteDeferred,

  });



  return (

    <NavigationContainer key={navigatorKey}>

      {user?.role === 'adult' ? (

        <AdultNavigator navigatorKey={navigatorKey} initialRouteName={initialRouteName} />

      ) : (

        <TeenNavigator navigatorKey={navigatorKey} initialRouteName={initialRouteName} />

      )}

    </NavigationContainer>

  );

}



const styles = StyleSheet.create({

  loading: { justifyContent: 'center', alignItems: 'center' },

});


