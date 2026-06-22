import { mergeProfileWithRemote } from '../../src/lib/profileSync';

describe('mergeProfileWithRemote', () => {
  const existing = {
    id: 'user-1',
    role: 'teen',
    legalName: 'Local Teen',
    displayName: 'Local',
    email: 'teen@example.com',
    dateOfBirth: '2010-01-01',
    stateCode: 'IL',
    permitIssueDate: '2026-06-01',
    updatedAt: '2026-06-10T12:00:00.000Z',
  };

  const remote = {
    id: 'user-1',
    role: 'teen',
    legalName: 'Remote Teen',
    displayName: 'Remote',
    email: 'teen@example.com',
    dateOfBirth: '2010-01-01',
    stateCode: 'IL',
    permitIssueDate: '2026-07-31',
    updatedAt: '2026-06-20T12:00:00.000Z',
  };

  test('prefers remote permit date when remote updated_at is newer', () => {
    const merged = mergeProfileWithRemote({
      existing,
      remote,
      roleLockedLocally: true,
    });
    expect(merged.permitIssueDate).toBe('2026-07-31');
    expect(merged.updatedAt).toBe('2026-06-20T12:00:00.000Z');
  });

  test('keeps local permit date when local updated_at is newer', () => {
    const merged = mergeProfileWithRemote({
      existing: { ...existing, updatedAt: '2026-06-25T12:00:00.000Z' },
      remote,
      roleLockedLocally: true,
    });
    expect(merged.permitIssueDate).toBe('2026-06-01');
  });

  test('fills empty local fields from remote when local is not newer', () => {
    const merged = mergeProfileWithRemote({
      existing: { ...existing, permitIssueDate: null, updatedAt: '2026-06-01T12:00:00.000Z' },
      remote,
      roleLockedLocally: true,
    });
    expect(merged.permitIssueDate).toBe('2026-07-31');
  });
});
