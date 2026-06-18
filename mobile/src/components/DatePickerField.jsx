import { useEffect, useState } from 'react';
import { View, Text, Platform, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate, parseISODate, toISODateOnly } from '../utils/time';

export function DatePickerField({ value, onChange, minimumDate, maximumDate, compact = false }) {
  const [date, setDate] = useState(() => parseISODate(value, maximumDate ?? new Date()));
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    setDate(parseISODate(value, maximumDate ?? new Date()));
  }, [value, maximumDate]);

  function applyDate(next) {
    setDate(next);
    onChange(toISODateOnly(next));
  }

  function onPickerChange(event, selected) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') return;
    }
    if (selected) applyDate(selected);
  }

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <View style={styles.compactRow}>
          <Text style={styles.compactDate}>{value ? formatDate(value) : 'Not set'}</Text>
          <Pressable onPress={() => setShowPicker((open) => !open)} hitSlop={8}>
            <Text style={styles.editLink}>{showPicker ? 'Done' : 'Edit'}</Text>
          </Pressable>
        </View>
        {showPicker && Platform.OS === 'ios' ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={onPickerChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={styles.iosPicker}
          />
        ) : null}
        {showPicker && Platform.OS === 'android' ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onPickerChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        ) : null}
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View style={styles.wrap}>
        <Pressable style={styles.androidBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.androidBtnText}>{value ? formatDate(value) : 'Select date'}</Text>
        </Pressable>
        {showPicker && (
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
  compactWrap: { marginBottom: 16 },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  compactDate: { fontSize: 16, color: '#1a2b3c' },
  editLink: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
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
