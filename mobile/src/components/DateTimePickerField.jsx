import { formatDateTime, parseISODateTime, toISOStringFromDate } from '../utils/time';
import { PickerField } from './PickerField';

export function DateTimePickerField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  accessibilityLabel,
}) {
  return (
    <PickerField
      value={value}
      onChange={onChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      accessibilityLabel={accessibilityLabel ?? 'Edit date and time'}
      mode="datetime"
      placeholder="Not set"
      formatDisplay={formatDateTime}
      parseValue={parseISODateTime}
      serializeValue={toISOStringFromDate}
      variant="datetime"
    />
  );
}
