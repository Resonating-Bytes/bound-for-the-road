import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ScreenHeaderBanners } from './ScreenHeaderBanners';
import { IconCircleButton } from './IconCircleButton';

export function ScreenHeader({ title, onBack, rightAction }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const backIcon = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back';

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 12,
            backgroundColor: theme.headerBackground,
            borderBottomColor: theme.headerBorder,
          },
        ]}
      >
        <View style={styles.row}>
          {onBack ? (
            <IconCircleButton
              icon={backIcon}
              onPress={onBack}
              accessibilityLabel="Go back"
              iconSize={Platform.OS === 'ios' ? 22 : 20}
            />
          ) : null}
          <Text style={[styles.title, { color: theme.headerText }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.rightSlot}>{rightAction ?? null}</View>
        </View>
      </View>
      <ScreenHeaderBanners />
    </View>
  );
}

const BACK_SIZE = 36;

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
  },
  headerBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
  },
  rightSlot: {
    minWidth: BACK_SIZE,
    alignItems: 'flex-end',
  },
});
