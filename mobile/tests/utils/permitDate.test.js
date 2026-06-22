import {
  isPermitActive,
  permitPickerMaximumDate,
  formatPermitStartsMessage,
  PERMIT_DATE_HINT,
} from '../../src/utils/permitDate';
import { toISODateOnly } from '../../src/utils/time';

describe('permitDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('isPermitActive is false before expected permit date', () => {
    expect(isPermitActive('2026-07-01')).toBe(false);
  });

  test('isPermitActive is true on and after permit date', () => {
    expect(isPermitActive('2026-06-15')).toBe(true);
    expect(isPermitActive('2026-06-01')).toBe(true);
  });

  test('permitPickerMaximumDate is one year ahead', () => {
    const max = permitPickerMaximumDate();
    expect(toISODateOnly(max)).toBe('2027-06-15');
  });

  test('formatPermitStartsMessage includes formatted date', () => {
    expect(formatPermitStartsMessage('2026-07-01')).toContain('2026');
    expect(PERMIT_DATE_HINT).toContain('change this later');
  });
});
