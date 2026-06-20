import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { ThemePickerSection } from '../../components/ThemePickerSection';
import { useKeyboardScrollAlign } from '../../hooks/useKeyboardScrollAlign';

export function SettingsAppearanceScreen({ navigation }) {
  const { scrollRef, scrollInputIntoView, onScroll, contentPaddingBottom } =
    useKeyboardScrollAlign();

  return (
    <Screen withHeader>
      <ScreenHeader title="Appearance" onBack={() => navigation.goBack()} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <ThemePickerSection onCustomColorInputFocus={scrollInputIntoView} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
