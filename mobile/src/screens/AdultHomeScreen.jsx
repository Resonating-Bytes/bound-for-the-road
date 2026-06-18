import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Screen } from '../components/Screen';

export function AdultHomeScreen({ navigation }) {
  return (
    <Screen style={styles.container}>
      <Text style={styles.title}>Adult dashboard</Text>
      <Text style={styles.body}>
        Session approvals and live session view arrive in a later update.
      </Text>

      <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.secondaryBtnText}>Settings</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1a2b3c', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, color: '#2a3b4c', marginBottom: 24 },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 16 },
});
