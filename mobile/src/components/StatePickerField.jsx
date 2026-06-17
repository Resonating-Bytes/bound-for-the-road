import { View, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { US_STATES } from '../config/usStates';

export function StatePickerField({ value, onChange }) {
  return (
    <View style={styles.wrap}>
      <Picker selectedValue={value} onValueChange={onChange} style={styles.picker} itemStyle={styles.item}>
        {US_STATES.map((state) => (
          <Picker.Item
            key={state.code}
            label={`${state.name} (${state.code})`}
            value={state.code}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 52,
  },
  item: {
    fontSize: 16,
  },
});
