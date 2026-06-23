import {
  navigateFromPushPayload,
  navigateToSignInNotice,
  navigationRef,
} from '../../src/navigation/navigationRef';

describe('navigateFromPushPayload', () => {
  beforeEach(() => {
    navigationRef.isReady = jest.fn(() => true);
    navigationRef.navigate = jest.fn();
  });

  test('returns false when navigation is not ready', () => {
    navigationRef.isReady = jest.fn(() => false);
    expect(navigateFromPushPayload({ type: 'pending_approval', requestHash: 'abc' }, 'adult')).toBe(
      false,
    );
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });

  test('adult opens ApproveSession for pending approval', () => {
    const ok = navigateFromPushPayload(
      { type: 'pending_approval', requestHash: 'hash-123' },
      'adult',
    );
    expect(ok).toBe(true);
    expect(navigationRef.navigate).toHaveBeenCalledWith('ApproveSession', {
      requestHash: 'hash-123',
    });
  });

  test('teen opens Dashboard when session is approved or sent back', () => {
    expect(navigateFromPushPayload({ type: 'session_approved' }, 'teen')).toBe(true);
    expect(navigateFromPushPayload({ type: 'session_declined' }, 'teen')).toBe(true);
    expect(navigationRef.navigate).toHaveBeenCalledWith('Dashboard');
  });

  test('ignores mismatched role or missing payload fields', () => {
    expect(navigateFromPushPayload({ type: 'pending_approval', requestHash: 'x' }, 'teen')).toBe(
      false,
    );
    expect(navigateFromPushPayload({ type: 'session_approved' }, 'adult')).toBe(false);
    expect(navigateFromPushPayload({ type: 'pending_approval' }, 'adult')).toBe(false);
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  });
});

describe('navigateToSignInNotice', () => {
  beforeEach(() => {
    navigationRef.isReady = jest.fn(() => true);
    navigationRef.navigate = jest.fn();
  });

  test('navigates to SignIn with notice when ready', () => {
    navigateToSignInNotice('Your email is already confirmed.');
    expect(navigationRef.navigate).toHaveBeenCalledWith({
      name: 'SignIn',
      params: { notice: 'Your email is already confirmed.' },
      merge: true,
    });
  });
});
