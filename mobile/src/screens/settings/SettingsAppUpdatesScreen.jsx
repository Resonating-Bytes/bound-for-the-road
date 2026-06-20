import { ScrollView, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppVersionSection } from '../../components/AppVersionSection';

export function SettingsAppUpdatesScreen({ navigation }) {
  return (
    <Screen withHeader>
      <ScreenHeader title="About" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <AppVersionSection hideSectionTitle />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
});
