import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { shortDisplayNamesForTeens } from '../utils/displayName';

export function TeenSwitcher({ teens, selectedTeenId, onSelectTeen, theme }) {
  const displayNames = useMemo(() => shortDisplayNamesForTeens(teens), [teens]);

  if (!teens?.length) return null;

  if (teens.length === 1) {
    return <Text style={styles.singleLabel}>Viewing: {displayNames[0]}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Viewing driver</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={teens.length > 3}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {teens.map((teen, index) => {
          const selected = teen.teenUserId === selectedTeenId;
          const label = displayNames[index];
          return (
            <Pressable
              key={teen.teenUserId}
              onPress={() => onSelectTeen(teen.teenUserId)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`View ${teen.name}'s log`}
              style={[
                styles.chip,
                selected && {
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                },
              ]}
            >
              <Text style={[styles.chipText, selected && { color: theme.accentText }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  singleLabel: {
    fontSize: 14,
    color: '#5a6b7c',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6a7b8c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    paddingRight: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2b3c',
  },
});
