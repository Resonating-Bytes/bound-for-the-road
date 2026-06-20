import { Text, Pressable, StyleSheet, Alert, ScrollView, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { SettingsNavRow } from '../components/SettingsNavRow';
import { canShowBackButton, navigateBackOrHome } from '../navigation/helpers';

export function SettingsScreen({ navigation }) {
  const { user, linked, signOut, requiresLink } = useAuth();

  function handleBack() {
    navigateBackOrHome(navigation, { linked, role: user?.role });
  }

  function handleSignOut() {
    Alert.alert('Sign out?', 'Your local driving log stays on this device. Use this to switch Google accounts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  const showBack = canShowBackButton(navigation, linked);

  const menuItems = [
    { key: 'profile', label: 'Profile', route: 'SettingsProfile' },
  ];

  if (requiresLink) {
    menuItems.push({
      key: 'linked',
      label: 'Linked accounts',
      route: 'SettingsLinkedAccounts',
    });
  }

  menuItems.push(
    { key: 'appearance', label: 'Appearance', route: 'SettingsAppearance' },
    { key: 'updates', label: 'About', route: 'SettingsAppUpdates' },
  );

  return (
    <Screen withHeader>
      <ScreenHeader title="Settings" onBack={showBack ? handleBack : undefined} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <SettingsNavRow
              key={item.key}
              label={item.label}
              onPress={() => navigation.navigate(item.route)}
              isLast={index === menuItems.length - 1}
            />
          ))}
        </View>

        <Pressable style={styles.secondaryBtn} onPress={handleSignOut}>
          <Text style={styles.secondaryBtnText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryBtnText: { color: '#1a2b3c', fontWeight: '600', fontSize: 16 },
});
