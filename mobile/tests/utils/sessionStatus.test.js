import {
  getSessionDisplayStatus,
} from '../../src/utils/sessionStatus';

const session = {
  id: 'sess-1',
  status: 'saved',
  requestHash: 'hash-new',
  startedAt: '2026-06-01T14:00:00.000Z',
};

describe('sessionStatus', () => {
  test('pending when submitted without approval', () => {
    const status = getSessionDisplayStatus(session, {
      submission: { requestHash: 'hash-new', superseded: false },
      approval: null,
      latestApproval: null,
    });
    expect(status.key).toBe('pending');
    expect(status.label).toBe('Pending approval');
  });

  test('saved locally when remote sync is still pending and app is blocked', () => {
    const status = getSessionDisplayStatus(session, {
      submission: { requestHash: 'hash-new', superseded: false },
      approval: null,
      latestApproval: null,
      pendingRemoteSync: true,
      canRemoteWrite: false,
    });
    expect(status.key).toBe('saved_local');
    expect(status.label).toBe('Saved on device — update app to send for approval');
  });

  test('saved locally when remote sync is pending but app can send', () => {
    const status = getSessionDisplayStatus(session, {
      submission: { requestHash: 'hash-new', superseded: false },
      approval: null,
      latestApproval: null,
      pendingRemoteSync: true,
      canRemoteWrite: true,
    });
    expect(status.key).toBe('saved_local');
    expect(status.label).toBe('Saved on device — ready to send for approval');
  });

  test('approved when hash matches approval', () => {
    const status = getSessionDisplayStatus(session, {
      submission: { requestHash: 'hash-new', superseded: false },
      approval: { requestHash: 'hash-new', approvedAt: '2026-06-02T10:00:00.000Z' },
      latestApproval: { requestHash: 'hash-new' },
      approverName: 'Pat Parent',
    });
    expect(status.key).toBe('approved');
    expect(status.label).toContain('Pat Parent');
  });

  test('superseded when latest approval is for older hash', () => {
    const status = getSessionDisplayStatus(session, {
      submission: { requestHash: 'hash-new', superseded: false },
      approval: null,
      latestApproval: { requestHash: 'hash-old' },
    });
    expect(status.key).toBe('superseded');
  });

  test('needs revision when saved without active submission', () => {
    const status = getSessionDisplayStatus(
      { ...session, requestHash: null },
      {
        submission: null,
        approval: null,
        latestApproval: null,
      },
    );
    expect(status.key).toBe('needs_revision');
    expect(status.label).toBe('Revision requested');
  });
});
