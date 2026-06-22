jest.mock('../../src/lib/supabase', () => {
  const upsert = jest.fn(() => Promise.resolve({ error: null }));
  return {
    isSupabaseConfigured: () => true,
    getSupabase: () => ({
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({ data: { user: { id: 'teen-001' } }, error: null }),
        ),
      },
      from: () => ({
        upsert,
        update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })),
      }),
    }),
  };
});

jest.mock('../../src/lib/network', () => ({
  isNetworkOnline: jest.fn(() => Promise.resolve(true)),
  isNetworkFailureError: (error) => {
    const message = String(error?.message ?? error ?? '').toLowerCase();
    return message.includes('network request failed') || message.includes('failed to fetch');
  },
}));

const mockCanUseRemoteWrite = jest.fn(() => true);

jest.mock('../../src/lib/compatibility', () => ({
  canUseRemoteWrite: (...args) => mockCanUseRemoteWrite(...args),
  getCachedCompatibility: jest.fn(() => ({ ok: true })),
}));

const mockFlushOutbox = jest.fn(() => Promise.resolve({ processed: 1, failed: false }));

jest.mock('../../src/lib/outboxSync', () => ({
  flushOutbox: (...args) => mockFlushOutbox(...args),
}));

jest.mock('../../src/db/queries', () => ({
  submitSession: jest.fn(async () => ({ id: 'sess-001', status: 'saved' })),
  getSubmissionForSession: jest.fn(() => ({
    requestHash: 'hash-1',
    sessionId: 'sess-001',
  })),
  getSessionById: jest.fn(() => ({ id: 'sess-001', status: 'saved', timeInvalid: false })),
  discardSubmittedSession: jest.fn(() => ({ id: 'sess-001', status: 'deleted' })),
  markSubmissionOutboxSynced: jest.fn(),
  clearOutboxForSession: jest.fn(),
  hasUnsyncedSubmissionOutbox: jest.fn(() => false),
  enqueueOutbox: jest.fn(),
}));

jest.mock('../../src/lib/approvalPush', () => ({
  notifyApprovalPush: jest.fn(() => Promise.resolve()),
  PUSH_EVENTS: { SESSION_SUBMITTED: 'session_submitted' },
}));

import { submitSessionForApproval, discardSessionSubmission } from '../../src/lib/submissions';
import { submitSession, getSubmissionForSession, discardSubmittedSession, enqueueOutbox, getSessionById, hasUnsyncedSubmissionOutbox } from '../../src/db/queries';
import { isNetworkOnline } from '../../src/lib/network';

describe('submitSessionForApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseRemoteWrite.mockReturnValue(true);
    getSessionById.mockReturnValue({ id: 'sess-001', status: 'saved', timeInvalid: false });
    hasUnsyncedSubmissionOutbox.mockReturnValue(true);
    mockFlushOutbox.mockResolvedValue({ processed: 1, failed: false });
  });

  test('flushes outbox after local save when online', async () => {
    hasUnsyncedSubmissionOutbox.mockReturnValueOnce(true).mockReturnValue(false);

    const result = await submitSessionForApproval('sess-001', {
      notes: '',
      submittedByUserId: 'teen-001',
    });

    expect(submitSession).toHaveBeenCalled();
    expect(mockFlushOutbox).toHaveBeenCalled();
    expect(result.remoteSynced).toBe(true);
  });

  test('returns timeInvalid without flushing when session overlaps', async () => {
    getSessionById.mockReturnValue({ id: 'sess-001', status: 'saved', timeInvalid: true });

    const result = await submitSessionForApproval('sess-001', {
      notes: '',
      submittedByUserId: 'teen-001',
    });

    expect(result.timeInvalid).toBe(true);
    expect(mockFlushOutbox).not.toHaveBeenCalled();
  });

  test('queues for outbox when compatibility blocks writes', async () => {
    mockCanUseRemoteWrite.mockReturnValue(false);
    const result = await submitSessionForApproval('sess-001', {
      notes: '',
      submittedByUserId: 'teen-001',
    });
    expect(submitSession).toHaveBeenCalled();
    expect(result.remoteSynced).toBe(false);
    expect(result.pendingRemote).toBe(true);
    expect(result.pendingReason).toBe('blocked');
  });

  test('queues for outbox when offline', async () => {
    isNetworkOnline.mockResolvedValue(false);
    const result = await submitSessionForApproval('sess-001', {
      notes: '',
      submittedByUserId: 'teen-001',
    });
    expect(result.remoteSynced).toBe(false);
    expect(result.pendingRemote).toBe(true);
    expect(result.pendingReason).toBe('offline');
    expect(mockFlushOutbox).not.toHaveBeenCalled();
  });
});

describe('discardSessionSubmission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseRemoteWrite.mockReturnValue(false);
    getSubmissionForSession.mockReturnValue({ requestHash: 'hash-1', sessionId: 'sess-001' });
    discardSubmittedSession.mockReturnValue({
      id: 'sess-001',
      status: 'deleted',
      teenUserId: 'teen-001',
    });
  });

  test('discards locally and queues withdraw when remote writes are blocked', async () => {
    await discardSessionSubmission('sess-001');
    expect(discardSubmittedSession).toHaveBeenCalledWith('sess-001');
    expect(enqueueOutbox).toHaveBeenCalledWith(
      'session_withdrawn',
      { sessionId: 'sess-001', requestHash: 'hash-1' },
      'teen-001',
    );
  });
});
