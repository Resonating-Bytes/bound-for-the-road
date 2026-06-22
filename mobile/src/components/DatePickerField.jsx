import { formatDate, parseISODate, toISODateOnly } from '../utils/time';
import { PickerField } from './PickerField';

export function DatePickerField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  accessibilityLabel,
  /** @deprecated Use default row + popover UX (same as session time fields). */
  compact = false,
}) {
  return (
    <PickerField
      value={value}
      onChange={onChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      accessibilityLabel={accessibilityLabel ?? 'Edit date'}
      mode="date"
      placeholder="Select date"
      formatDisplay={formatDate}
      parseValue={(v) => parseISODate(v, maximumDate ?? new Date())}
      serializeValue={toISODateOnly}
      syncDeps={[maximumDate]}
      compact={compact}
      variant="date"
    />
  );
}
