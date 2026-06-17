import { useState } from 'react';
import { View, Text, Platform, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate, parseISODate, toISODateOnly } from '../utils/time';

export function DatePickerField({ value, onChange, minimumDate, maximumDate }) {
  const [date, setDate] = useState(() => parseISODate(value, maximumDate ?? new Date()));
  const [showAndroid, setShowAndroid] = useState(false);

  function applyDate(next) {
    setDate(next);
    onChange(toISODateOnly(next));
  }

  function onPickerChange(event, selected) {
    if (Platform.OS === 'android') {
      setShowAndroid(false);
      if (event.type === 'dismissed') return;
    }
    if (selected) applyDate(selected);
  }

  if (Platform.OS === 'android') {
    return (
      <View style={styles.wrap}>
        <Pressable style={styles.androidBtn} onPress={() => setShowAndroid(true)}>
          <Text style={styles.androidBtnText}>{value ? formatDate(value) : 'Select date'}</Text>
        </Pressable>
        {showAndroid && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onPickerChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.iosWrap}>
      <Text style={styles.iosPreview}>{value ? formatDate(value) : 'Select date'}</Text>
      <DateTimePicker
        value={date}
        mode="date"
        display="spinner"
        onChange={onPickerChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        style={styles.iosPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  androidBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  androidBtnText: { fontSize: 16, color: '#1a2b3c' },
  iosWrap: { marginBottom: 12 },
  iosPreview: {
    fontSize: 16,
    color: '#1a2b3c',
    marginBottom: 4,
    fontWeight: '600',
  },
  iosPicker: { height: 180 },
});
