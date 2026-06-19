import { View, Text, Pressable, StyleSheet } from 'react-native';

const VARIANT_STYLES = {
  warning: {
    container: { backgroundColor: '#fef3c7' },
    text: { color: '#92400e' },
    action: { color: '#b45309' },
    divider: '#fcd34d',
  },
  preview: {
    container: { backgroundColor: '#ede9fe' },
    text: { color: '#5b21b6' },
    action: { color: '#6d28d9' },
    divider: '#c4b5fd',
  },
  info: {
    container: { backgroundColor: '#eff6ff' },
    text: { color: '#1e40af' },
    action: { color: '#2563eb' },
    divider: '#bfdbfe',
  },
};

export function HeaderBanner({ variant = 'warning', message, actionLabel, onAction, showDivider }) {
  const palette = VARIANT_STYLES[variant] ?? VARIANT_STYLES.warning;

  return (
    <View
      style={[
        styles.banner,
        palette.container,
        showDivider && { borderBottomWidth: 1, borderBottomColor: palette.divider },
      ]}
    >
      <Text style={[styles.text, palette.text]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={[styles.action, palette.action]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HeaderBannerStack({ banners }) {
  if (!banners?.length) return null;

  return (
    <View style={styles.stack}>
      {banners.map((banner, index) => (
        <HeaderBanner
          key={banner.id}
          variant={banner.variant}
          message={banner.message}
          actionLabel={banner.actionLabel}
          onAction={banner.onAction}
          showDivider={index < banners.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    fontWeight: '600',
    fontSize: 14,
  },
});
