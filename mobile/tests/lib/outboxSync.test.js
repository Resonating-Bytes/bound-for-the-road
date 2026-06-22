jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'teen-1' } } })),
    },
  }),
}));

const mockCanUseRemoteWrite = jest.fn(() => true);

jest.mock('../../src/lib/compatibility', () => ({
  canUseRemoteWrite: (...args) => mockCanUseRemoteWrite(...args),
  getCachedCompatibility: jest.fn(() => ({ ok: true })),
}));

jest.mock('../../src/lib/network', () => ({
  isNetworkOnline: jest.fn(() => Promise.resolve(true)),
  subscribeNetwork: jest.fn(() => jest.fn()),
}));

const mockPullAndMerge = jest.fn(() => Promise.resolve());

jest.mock('../../src/lib/sessionSync', () => ({
  pullAndMergeTeenSessions: (...args) => mockPullAndMerge(...args),
}));

const mockPushSubmitted = jest.fn(() => Promise.resolve());
const mockPushApproval = jest.fn(() => Promise.resolve());
const mockPushDecline = jest.fn(() => Promise.resolve());
const mockPushWithdraw = jest.fn(() => Promise.resolve());

jest.mock('../../src/lib/submissions', () => ({
  pushSubmittedSessionToRemote: (...args) => mockPushSubmitted(...args),
  pushApprovalToRemote: (...args) => mockPushApproval(...args),
  pushDeclineToRemote: (...args) => mockPushDecline(...args),
  pushWithdrawToRemote: (...args) => mockPushWithdraw(...args),
}));

const mockListPending = jest.fn(() => []);
const mockMarkSynced = jest.fn();
const mockGetSession = jest.fn();
const mockGetSubmission = jest.fn();
const mockGetUserById = jest.fn(() => ({ role: 'teen' }));

jest.mock('../../src/db/queries', () => ({
  listPendingOutboxRowsForUser: (userId) =>
    mockListPending().filter((row) => row.userId === userId || !row.userId),
  markOutboxRowSynced: (...args) => mockMarkSynced(...args),
  getSessionById: (...args) => mockGetSession(...args),
  getSubmissionForSession: (...args) => mockGetSubmission(...args),
  getUserById: (...args) => mockGetUserById(...args),
}));

import { flushOutbox, getOutboxSyncSnapshot } from '../../src/lib/outboxSync';
import { isNetworkOnline } from '../../src/lib/network';

describe('flushOutbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseRemoteWrite.mockReturnValue(true);
    isNetworkOnline.mockResolvedValue(true);
    mockGetUserById.mockReturnValue({ role: 'teen' });
  });

  test('pulls teen sessions before replaying session_submitted', async () => {
    mockListPending.mockReturnValue([
      {
        id: 'ob-1',
        operation: 'session_submitted',
        payloadJson: JSON.stringify({ sessionId: 'sess-1' }),
        userId: 'teen-1',
      },
    ]);
    mockGetSession.mockReturnValue({
      id: 'sess-1',
      status: 'saved',
      teenUserId: 'teen-1',
      timeInvalid: false,
    });
    mockGetSubmission.mockReturnValue({ requestHash: 'hash-1', superseded: false });

    await flushOutbox();

    expect(mockPullAndMerge).toHaveBeenCalledWith('teen-1');
    expect(mockPushSubmitted).toHaveBeenCalled();
  });

  test('replays session_approved rows', async () => {
    mockListPending.mockReturnValue([
      {
        id: 'ob-2',
        operation: 'session_approved',
        payloadJson: JSON.stringify({ sessionId: 'sess-1', requestHash: 'hash-1' }),
        userId: 'teen-1',
      },
    ]);

    await flushOutbox();

    expect(mockPushApproval).toHaveBeenCalledWith({ sessionId: 'sess-1', requestHash: 'hash-1' });
    expect(mockMarkSynced).toHaveBeenCalledWith('ob-2');
  });

  test('defers session_submitted when session is time invalid', async () => {
    mockListPending.mockReturnValue([
      {
        id: 'ob-1',
        operation: 'session_submitted',
        payloadJson: JSON.stringify({ sessionId: 'sess-1' }),
        userId: 'teen-1',
      },
    ]);
    mockGetSession.mockReturnValue({
      id: 'sess-1',
      status: 'saved',
      teenUserId: 'teen-1',
      timeInvalid: true,
    });
    mockGetSubmission.mockReturnValue({ requestHash: 'hash-1', superseded: false });

    const result = await flushOutbox();

    expect(mockPushSubmitted).not.toHaveBeenCalled();
    expect(mockMarkSynced).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 1, failed: false });
  });

  test('skips outbox rows for other signed-in users', async () => {
    mockListPending.mockReturnValue([
      {
        id: 'ob-other',
        operation: 'session_submitted',
        payloadJson: JSON.stringify({ sessionId: 'sess-1' }),
        userId: 'other-teen',
      },
    ]);

    const result = await flushOutbox();

    expect(mockPushSubmitted).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, failed: false });
  });

  test('skips when offline', async () => {
    isNetworkOnline.mockResolvedValue(false);
    mockListPending.mockReturnValue([
      {
        id: 'ob-1',
        operation: 'session_submitted',
        payloadJson: JSON.stringify({ sessionId: 'sess-1' }),
      },
    ]);

    const result = await flushOutbox();

    expect(mockPushSubmitted).not.toHaveBeenCalled();
    expect(result).toEqual({ processed: 0, failed: false });
  });

  test('drops orphan rows when session is gone locally', async () => {
    mockListPending.mockReturnValue([
      {
        id: 'ob-1',
        operation: 'session_submitted',
        payloadJson: JSON.stringify({ sessionId: 'sess-gone' }),
        userId: 'teen-1',
      },
    ]);
    mockGetSession.mockReturnValue(null);

    await flushOutbox();

    expect(mockMarkSynced).toHaveBeenCalledWith('ob-1');
    expect(mockPushSubmitted).not.toHaveBeenCalled();
  });

  test('reports not syncing after flush completes', async () => {
    mockListPending.mockReturnValue([]);
    await flushOutbox();
    expect(getOutboxSyncSnapshot().isSyncing).toBe(false);
  });
});
