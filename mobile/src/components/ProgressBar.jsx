import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function ProgressBar({ label, currentMinutes, targetHours, color }) {
  const { theme } = useTheme();
  const fillColor = color ?? theme.accent;
  const targetMinutes = targetHours * 60;
  const pct = targetMinutes > 0 ? Math.min(100, (currentMinutes / targetMinutes) * 100) : 0;
  const currentHours = Math.round((currentMinutes / 60) * 10) / 10;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {currentHours} / {targetHours} hrs
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 15, fontWeight: '600', color: '#1a2b3c' },
  value: { fontSize: 14, color: '#5a6b7c' },
  track: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5 },
});
