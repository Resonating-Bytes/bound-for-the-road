import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from './ProgressBar';
import { IL_RULES } from '../config/states/IL';
import { formatDate } from '../utils/time';

export function DriverProgressSummary({
  driverName,
  progress,
  eligibility,
  showDriverName = false,
}) {
  return (
    <View style={styles.block}>
      {showDriverName ? <Text style={styles.driverName}>{driverName}</Text> : null}
      {eligibility ? (
        <Text style={styles.eligibility}>
          Earliest license eligibility: {formatDate(eligibility)}
        </Text>
      ) : null}
      <ProgressBar
        label="Total practice"
        currentMinutes={progress.totalMinutes}
        targetHours={IL_RULES.totalHours}
      />
      <ProgressBar
        label="Night practice"
        currentMinutes={progress.nightMinutes}
        targetHours={IL_RULES.nightHours}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2b3c',
    marginBottom: 8,
  },
  eligibility: {
    fontSize: 14,
    color: '#5a6b7c',
    marginBottom: 16,
  },
});
