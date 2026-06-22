import { groupSessionsForDashboard, groupAdultDashboardSections } from '../../src/utils/dashboardSessions';
import { INVALID_SESSIONS_SECTION_TITLE } from '../../src/utils/sessionValidation';

describe('groupSessionsForDashboard', () => {
  const sessions = [
    { id: 'a', startedAt: '2026-06-01T10:00:00.000Z' },
    { id: 'b', startedAt: '2026-06-03T10:00:00.000Z' },
    { id: 'c', startedAt: '2026-06-02T10:00:00.000Z' },
    { id: 'd', startedAt: '2026-06-04T10:00:00.000Z' },
  ];

  test('orders invalid, revision, pending, then approved sections', () => {
    const sections = groupSessionsForDashboard(sessions, {
      a: { key: 'approved', label: 'Approved' },
      b: { key: 'pending', label: 'Pending approval' },
      c: { key: 'needs_revision', label: 'Revision requested' },
      d: { key: 'time_invalid', label: 'Fix overlap' },
    });

    expect(sections.map((section) => section.title)).toEqual([
      INVALID_SESSIONS_SECTION_TITLE,
      'Revision requested',
      'Pending',
      'Approved',
    ]);
    expect(sections[0].data.map((row) => row.id)).toEqual(['d']);
    expect(sections[1].data.map((row) => row.id)).toEqual(['c']);
    expect(sections[2].data.map((row) => row.id)).toEqual(['b']);
    expect(sections[3].data.map((row) => row.id)).toEqual(['a']);
  });

  test('omits empty sections', () => {
    const sections = groupSessionsForDashboard(sessions, {
      a: { key: 'approved', label: 'Approved' },
      b: { key: 'approved', label: 'Approved' },
      c: { key: 'approved', label: 'Approved' },
      d: { key: 'approved', label: 'Approved' },
    });

    expect(sections).toEqual([
      {
        key: 'approved',
        title: 'Approved',
        data: [
          { id: 'd', startedAt: '2026-06-04T10:00:00.000Z' },
          { id: 'b', startedAt: '2026-06-03T10:00:00.000Z' },
          { id: 'c', startedAt: '2026-06-02T10:00:00.000Z' },
          { id: 'a', startedAt: '2026-06-01T10:00:00.000Z' },
        ],
      },
    ]);
  });
});

describe('groupAdultDashboardSections', () => {
  test('orders pending then approved', () => {
    const pending = [
      {
        requestHash: 'p1',
        submittedAt: '2026-06-03T10:00:00.000Z',
        session: {},
      },
      {
        requestHash: 'p2',
        submittedAt: '2026-06-04T10:00:00.000Z',
        session: {},
      },
    ];
    const approved = [
      { requestHash: 'a1', approvedAt: '2026-06-02T10:00:00.000Z' },
    ];

    const sections = groupAdultDashboardSections(pending, approved);
    expect(sections.map((section) => section.title)).toEqual(['Pending approval', 'Approved']);
    expect(sections[0].data.map((row) => row.requestHash)).toEqual(['p2', 'p1']);
  });
});
