import { formatAdultApprovedLabel } from '../../src/utils/approvalDisplay';

describe('formatAdultApprovedLabel', () => {
  const viewerId = 'adult-1';
  const baseItem = {
    approvedAt: '2026-06-01T12:00:00.000Z',
    approvedByUserId: viewerId,
    approverName: 'Pat Parent',
    joinedSession: true,
    approverPresent: 'co_present',
  };

  test('uses "You approved" when viewer approved and was in the car', () => {
    expect(formatAdultApprovedLabel(baseItem, viewerId)).toMatch(/^You approved,/);
  });

  test('attributes to supervisor when another adult was in the car', () => {
    expect(
      formatAdultApprovedLabel(
        {
          ...baseItem,
          approverPresent: 'other_adult',
          approverName: 'Alex Other',
        },
        viewerId,
      ),
    ).toBe('Approved by Alex Other, Jun 1, 2026');
  });

  test('attributes to supervisor when another linked adult approved in the app', () => {
    expect(
      formatAdultApprovedLabel(
        {
          ...baseItem,
          approvedByUserId: 'adult-2',
          approverName: 'Sam Supervisor',
          approverPresent: 'co_present',
        },
        viewerId,
      ),
    ).toBe('Approved by Sam Supervisor, Jun 1, 2026');
  });
});
