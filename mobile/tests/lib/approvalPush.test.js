const mockInvoke = jest.fn(() => ({ error: null }));

jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  getSupabase: jest.fn(() => ({
    functions: { invoke: mockInvoke },
  })),
}));

import { APP_VERSION } from '../../src/config/compatibility';

describe('approvalPush', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    jest.resetModules();
    require('../../src/lib/supabase').isSupabaseConfigured.mockReturnValue(true);
  });

  test('invokes send-approval-push edge function', async () => {
    const { notifyApprovalPush, PUSH_EVENTS } = require('../../src/lib/approvalPush');
    await notifyApprovalPush(PUSH_EVENTS.SESSION_SUBMITTED, {
      sessionId: 'session-1',
      requestHash: 'hash-1',
      nearbyAdultIds: ['adult-a'],
    });
    expect(mockInvoke).toHaveBeenCalledWith('send-approval-push', {
      body: {
        event: 'session_submitted',
        sessionId: 'session-1',
        requestHash: 'hash-1',
        clientVersion: APP_VERSION,
        nearbyAdultIds: ['adult-a'],
      },
    });
  });

  test('no-ops when Supabase is not configured', async () => {
    require('../../src/lib/supabase').isSupabaseConfigured.mockReturnValue(false);
    const { notifyApprovalPush, PUSH_EVENTS } = require('../../src/lib/approvalPush');
    await notifyApprovalPush(PUSH_EVENTS.SESSION_APPROVED, {
      sessionId: 'session-2',
      requestHash: 'hash-2',
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
