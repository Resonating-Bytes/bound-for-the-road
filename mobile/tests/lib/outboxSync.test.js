jest.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
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

jest.mock('../../src/db/queries', () => ({
  listPendingOutboxRows: () => mockListPending(),
  markOutboxRowSynced: (...args) => mockMarkSynced(...args),
  getSessionById: (...args) => mockGetSession(...args),
  getSubmissionForSession: (...args) => mockGetSubmission(...args),
}));

import { flushOutbox, getOutboxSyncSnapshot } from '../../src/lib/outboxSync';
import { isNetworkOnline } from '../../src/lib/network';

describe('flushOutbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseRemoteWrite.mockReturnValue(true);
    isNetworkOnline.mockResolvedValue(true);
  });

  test('replays session_approved rows', async () => {
    mockListPending.mockReturnValue([
      {
        id: 'ob-2',
        operation: 'session_approved',
        payloadJson: JSON.stringify({ sessionId: 'sess-1', requestHash: 'hash-1' }),
      },
    ]);

    await flushOutbox();

    expect(mockPushApproval).toHaveBeenCalledWith({ sessionId: 'sess-1', requestHash: 'hash-1' });
    expect(mockMarkSynced).toHaveBeenCalledWith('ob-2');
  });

  test('replays session_submitted rows in order', async () => {
    mockListPending.mockReturnValue([
      {
        id: 'ob-1',
        operation: 'session_submitted',
        payloadJson: JSON.stringify({ sessionId: 'sess-1' }),
      },
    ]);
    mockGetSession.mockReturnValue({ id: 'sess-1', status: 'saved' });
    mockGetSubmission.mockReturnValue({ requestHash: 'hash-1', superseded: false });

    const result = await flushOutbox();

    expect(mockPushSubmitted).toHaveBeenCalledWith(
      'sess-1',
      { id: 'sess-1', status: 'saved' },
      { requestHash: 'hash-1', superseded: false },
    );
    expect(result).toEqual({ processed: 1, failed: false });
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
