import { ScrollView, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemePickerSection } from '../../components/ThemePickerSection';

export function SettingsAppearanceScreen({ navigation }) {
  return (
    <Screen withHeader>
      <ScreenHeader title="Appearance" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ThemePickerSection />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
});
