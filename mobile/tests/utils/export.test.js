import { renderExportTemplate } from '../../src/utils/export';

describe('export', () => {
  test('includes Illinois header, driver info, sessions, and totals', () => {
    const user = {
      legalName: 'Alex Driver',
      permitIssueDate: '2025-09-01',
      stateCode: 'IL',
    };
    const sessions = [
      {
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
        durationMinutes: 60,
        nightMinutes: 0,
        notes: 'Neighborhood loop',
        requestHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      },
      {
        startedAt: '2026-06-02T03:00:00.000Z',
        endedAt: '2026-06-02T04:30:00.000Z',
        durationMinutes: 90,
        nightMinutes: 90,
        notes: null,
        requestHash: null,
      },
    ];

    const text = renderExportTemplate(sessions, user);

    expect(text).toContain('Bound for the Road — Illinois Supervised Driving Log');
    expect(text).toContain('Driver: Alex Driver');
    expect(text).toContain('Permit issue date:');
    expect(text).toContain('Earliest license eligibility (9 months):');
    expect(text).toContain('State: IL');
    expect(text).toContain('Neighborhood loop');
    expect(text).toContain('Total practice: 2.5 / 50 hours');
    expect(text).toContain('Night practice: 1.5 / 10 hours');
    expect(text).not.toContain('Record hash');
    expect(text).toContain('Disclaimer: Summarized for convenience');
  });

  test('shows empty sessions placeholder', () => {
    const text = renderExportTemplate([], {
      legalName: 'Alex Driver',
      stateCode: 'IL',
    });
    expect(text).toContain('(No saved sessions)');
  });

  test('includes road category when opted in and session has breakdown', () => {
    const user = { legalName: 'Alex Driver', stateCode: 'IL' };
    const sessions = [
      {
        startedAt: '2026-06-01T14:00:00.000Z',
        endedAt: '2026-06-01T15:00:00.000Z',
        durationMinutes: 60,
        nightMinutes: 0,
        highwayRoadMinutes: 20,
        notes: null,
      },
    ];
    const off = renderExportTemplate(sessions, user);
    const on = renderExportTemplate(sessions, user, { includeRoadCategory: true });
    expect(off).not.toContain('Road category:');
    expect(on).toContain('Road category: 40 min local\n  20 min highway');
  });
});
