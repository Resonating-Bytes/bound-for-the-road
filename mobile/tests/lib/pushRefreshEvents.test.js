import { emitApprovalPushReceived, onApprovalPushReceived } from '../../src/lib/pushRefreshEvents';

describe('pushRefreshEvents', () => {
  test('notifies subscribers for approval push types', () => {
    const listener = jest.fn();
    const unsubscribe = onApprovalPushReceived(listener);

    emitApprovalPushReceived({ type: 'pending_approval', requestHash: 'abc' });
    expect(listener).toHaveBeenCalledWith({ type: 'pending_approval', requestHash: 'abc' });

    unsubscribe();
    listener.mockClear();
    emitApprovalPushReceived({ type: 'session_approved' });
    expect(listener).not.toHaveBeenCalled();
  });

  test('ignores payloads without type', () => {
    const listener = jest.fn();
    onApprovalPushReceived(listener);
    emitApprovalPushReceived({});
    expect(listener).not.toHaveBeenCalled();
  });
});
