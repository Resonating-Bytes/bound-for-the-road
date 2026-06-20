import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Platform,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateTime, parseISODateTime, toISOStringFromDate } from '../utils/time';
import { useTheme } from '../context/ThemeContext';

const PICKER_HEIGHT = 220;
const GAP = 8;
const SCREEN_MARGIN = 20;

export function DateTimePickerField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  accessibilityLabel,
}) {
  const { theme } = useTheme();
  const rowRef = useRef(null);
  const [date, setDate] = useState(() => parseISODateTime(value));
  const [showPicker, setShowPicker] = useState(false);
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    setDate(parseISODateTime(value));
  }, [value]);

  function applyDate(next) {
    setDate(next);
    onChange(toISOStringFromDate(next));
  }

  function closePicker() {
    setShowPicker(false);
    setAnchor(null);
  }

  function openPicker() {
    rowRef.current?.measureInWindow((_x, y, _width, height) => {
      const windowHeight = Dimensions.get('window').height;
      const windowWidth = Dimensions.get('window').width;
      const belowTop = y + height + GAP;
      const fitsBelow = belowTop + PICKER_HEIGHT <= windowHeight - SCREEN_MARGIN;
      const top = fitsBelow
        ? belowTop
        : Math.max(SCREEN_MARGIN, y - PICKER_HEIGHT - GAP);
      const left = SCREEN_MARGIN;
      const pickerWidth = windowWidth - 2 * SCREEN_MARGIN;

      setAnchor({ top, left, width: pickerWidth });
      setShowPicker(true);
    });
  }

  function onPickerChange(event, selected) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      setAnchor(null);
      if (event.type === 'dismissed') return;
    }
    if (selected) applyDate(selected);
  }

  return (
    <View style={styles.wrap}>
      <View ref={rowRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? 'Edit date and time'}
          accessibilityState={{ expanded: showPicker }}
        >
          <Text style={styles.value}>{value ? formatDateTime(value) : 'Not set'}</Text>
          <Text style={[styles.editLink, { color: theme.accent }]}>Edit</Text>
        </Pressable>
      </View>

      {showPicker && Platform.OS === 'ios' ? (
        <Modal visible transparent animationType="fade" onRequestClose={closePicker}>
          <Pressable style={styles.backdrop} onPress={closePicker} accessibilityLabel="Done">
            {anchor ? (
              <View
                style={[
                  styles.pickerPopover,
                  { top: anchor.top, left: anchor.left, width: anchor.width },
                ]}
                onStartShouldSetResponder={() => true}
              >
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  display="spinner"
                  onChange={onPickerChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  style={[styles.iosPicker, { width: anchor.width }]}
                />
              </View>
            ) : null}
          </Pressable>
        </Modal>
      ) : null}

      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={onPickerChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  row: {
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
  rowPressed: {
    opacity: 0.85,
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: '#1a2b3c',
    fontWeight: '500',
    paddingRight: 12,
  },
  editLink: { fontSize: 16, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  pickerPopover: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iosPicker: { height: PICKER_HEIGHT },
});
