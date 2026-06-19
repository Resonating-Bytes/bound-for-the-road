jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => ({
    from: () => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
    }),
  }),
}));

const mockCanUseRemoteWrite = jest.fn(() => true);

jest.mock('../../src/lib/compatibility', () => ({
  canUseRemoteWrite: (...args) => mockCanUseRemoteWrite(...args),
  getCachedCompatibility: jest.fn(() => ({ ok: true })),
}));

jest.mock('../../src/db/queries', () => ({
  submitSession: jest.fn(async () => ({ id: 'sess-001', status: 'saved' })),
  getSubmissionForSession: jest.fn(() => ({
    requestHash: 'hash-1',
    sessionId: 'sess-001',
  })),
  getSessionById: jest.fn(),
  withdrawSubmission: jest.fn(() => ({ id: 'sess-001', status: 'deleted' })),
  markSubmissionOutboxSynced: jest.fn(),
  clearOutboxForSession: jest.fn(),
  hasUnsyncedSubmissionOutbox: jest.fn(),
}));

jest.mock('../../src/lib/approvalPush', () => ({
  notifyApprovalPush: jest.fn(() => Promise.resolve()),
  PUSH_EVENTS: { SESSION_SUBMITTED: 'session_submitted' },
}));

import { submitSessionForApproval, withdrawSessionSubmission } from '../../src/lib/submissions';
import { submitSession, getSubmissionForSession, withdrawSubmission } from '../../src/db/queries';

describe('submitSessionForApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseRemoteWrite.mockReturnValue(true);
  });

  test('saves locally before remote sync when allowed', async () => {
    const result = await submitSessionForApproval('sess-001', {
      notes: '',
      submittedByUserId: 'teen-001',
    });
    expect(submitSession).toHaveBeenCalled();
    expect(result.remoteSynced).toBe(true);
  });

  test('saves locally but skips remote when compatibility blocks writes', async () => {
    mockCanUseRemoteWrite.mockReturnValue(false);
    const result = await submitSessionForApproval('sess-001', {
      notes: '',
      submittedByUserId: 'teen-001',
    });
    expect(submitSession).toHaveBeenCalled();
    expect(result.remoteSynced).toBe(false);
    expect(result.pendingRemote).toBe(true);
  });
});

describe('withdrawSessionSubmission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseRemoteWrite.mockReturnValue(false);
    getSubmissionForSession.mockReturnValue({ requestHash: 'hash-1', sessionId: 'sess-001' });
    withdrawSubmission.mockReturnValue({ id: 'sess-001', status: 'deleted' });
  });

  test('withdraws locally when remote writes are blocked', async () => {
    await withdrawSessionSubmission('sess-001');
    expect(withdrawSubmission).toHaveBeenCalledWith('sess-001');
  });
});
