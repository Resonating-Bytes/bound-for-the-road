import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { IconCircleButton } from './IconCircleButton';

export function ScreenHeader({ title, onBack, rightAction }) {
  const insets = useSafeAreaInsets();
  const backIcon = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back';

  return (
    <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
      <View style={styles.row}>
        {onBack ? (
          <IconCircleButton
            icon={backIcon}
            onPress={onBack}
            accessibilityLabel="Go back"
            iconSize={Platform.OS === 'ios' ? 22 : 20}
          />
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.rightSlot}>{rightAction ?? null}</View>
      </View>
    </View>
  );
}

const BACK_SIZE = 36;

const styles = StyleSheet.create({
  headerBar: {
    backgroundColor: colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: colors.textPrimary,
  },
  rightSlot: {
    minWidth: BACK_SIZE,
    alignItems: 'flex-end',
  },
});
