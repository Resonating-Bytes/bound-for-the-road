import { groupSessionsForDashboard, groupAdultDashboardSections } from '../../src/utils/dashboardSessions';

describe('groupSessionsForDashboard', () => {
  const sessions = [
    { id: 'a', startedAt: '2026-06-01T10:00:00.000Z' },
    { id: 'b', startedAt: '2026-06-03T10:00:00.000Z' },
    { id: 'c', startedAt: '2026-06-02T10:00:00.000Z' },
  ];

  test('orders revision, pending, then approved sections', () => {
    const sections = groupSessionsForDashboard(sessions, {
      a: { key: 'approved', label: 'Approved' },
      b: { key: 'pending', label: 'Pending approval' },
      c: { key: 'needs_revision', label: 'Revision requested' },
    });

    expect(sections.map((section) => section.title)).toEqual([
      'Revision requested',
      'Pending',
      'Approved',
    ]);
    expect(sections[0].data.map((row) => row.id)).toEqual(['c']);
    expect(sections[1].data.map((row) => row.id)).toEqual(['b']);
    expect(sections[2].data.map((row) => row.id)).toEqual(['a']);
  });

  test('omits empty sections', () => {
    const sections = groupSessionsForDashboard(sessions, {
      a: { key: 'approved', label: 'Approved' },
      b: { key: 'approved', label: 'Approved' },
      c: { key: 'approved', label: 'Approved' },
    });

    expect(sections).toEqual([
      {
        key: 'approved',
        title: 'Approved',
        data: [
          { id: 'b', startedAt: '2026-06-03T10:00:00.000Z' },
          { id: 'c', startedAt: '2026-06-02T10:00:00.000Z' },
          { id: 'a', startedAt: '2026-06-01T10:00:00.000Z' },
        ],
      },
    ]);
  });
});

describe('groupAdultDashboardSections', () => {
  test('groups pending then approved for adult dashboard', () => {
    const pending = [{ requestHash: 'p1', submittedAt: '2026-06-03T10:00:00.000Z' }];
    const approved = [
      { requestHash: 'a1', approvedAt: '2026-06-02T10:00:00.000Z' },
      { requestHash: 'a2', approvedAt: '2026-06-01T10:00:00.000Z' },
    ];

    const sections = groupAdultDashboardSections(pending, approved);
    expect(sections.map((section) => section.title)).toEqual(['Pending', 'Approved']);
    expect(sections[0].data).toHaveLength(1);
    expect(sections[1].data).toHaveLength(2);
  });
});
