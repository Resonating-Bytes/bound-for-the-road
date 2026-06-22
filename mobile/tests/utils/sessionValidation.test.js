import {
  SESSION_INVALID_REASONS,
  getSessionInvalidReasons,
  getSessionInvalidHints,
  getPrimaryInvalidHint,
  sessionHasBlockingInvalid,
} from '../../src/utils/sessionValidation';

describe('sessionValidation', () => {
  test('maps time_invalid to overlap reason and hints', () => {
    const session = { id: 's1', timeInvalid: true };
    expect(getSessionInvalidReasons(session)).toEqual([SESSION_INVALID_REASONS.TIME_OVERLAP]);
    expect(sessionHasBlockingInvalid(session)).toBe(true);
    expect(getPrimaryInvalidHint(session, 'teen')).toContain('Overlapping');
    expect(getSessionInvalidHints(session, 'teen')).toHaveLength(1);
  });

  test('valid session has no reasons', () => {
    expect(sessionHasBlockingInvalid({ timeInvalid: false })).toBe(false);
    expect(getSessionInvalidReasons({})).toEqual([]);
  });
});
