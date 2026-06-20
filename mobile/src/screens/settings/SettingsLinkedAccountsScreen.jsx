import { ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { LinkedAccountsSection } from '../../components/LinkedAccountsSection';

export function SettingsLinkedAccountsScreen({ navigation }) {
  const { user, refreshLinks } = useAuth();
  const isTeen = user?.role === 'teen';

  function handleInvite() {
    navigation.navigate(isTeen ? 'LinkTeen' : 'LinkAdult');
  }

  return (
    <Screen withHeader>
      <ScreenHeader title="Linked accounts" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <LinkedAccountsSection
          userId={user?.id}
          role={user?.role}
          refreshLinks={refreshLinks}
          onInvite={handleInvite}
          hideSectionTitle
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
});
