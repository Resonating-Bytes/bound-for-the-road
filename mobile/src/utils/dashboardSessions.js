const SESSION_SORT = (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();

/** Group saved sessions for the teen dashboard list. */
export function groupSessionsForDashboard(sessions, statusBySessionId) {
  const pending = [];
  const needsRevision = [];
  const approved = [];

  for (const session of sessions) {
    const status = statusBySessionId[session.id];
    if (status?.key === 'approved') {
      approved.push(session);
    } else if (status?.key === 'needs_revision') {
      needsRevision.push(session);
    } else {
      pending.push(session);
    }
  }

  pending.sort(SESSION_SORT);
  needsRevision.sort(SESSION_SORT);
  approved.sort(SESSION_SORT);

  const sections = [];
  if (needsRevision.length) {
    sections.push({ key: 'revision', title: 'Revision requested', data: needsRevision });
  }
  if (pending.length) {
    sections.push({ key: 'pending', title: 'Pending', data: pending });
  }
  if (approved.length) {
    sections.push({ key: 'approved', title: 'Approved', data: approved });
  }

  return sections;
}

/** Group pending + approved rows for the adult dashboard (no revision section). */
export function groupAdultDashboardSections(pending, approved) {
  const sections = [];
  if (pending.length) {
    sections.push({ key: 'pending', title: 'Pending', data: pending });
  }
  if (approved.length) {
    sections.push({ key: 'approved', title: 'Approved', data: approved });
  }
  return sections;
}

/** Scope adult dashboard session rows to one linked teen. */
export function filterSubmissionsForTeen(rows, teenUserId) {
  if (!teenUserId) return rows ?? [];
  return (rows ?? []).filter((row) => row.session?.teenUserId === teenUserId);
}
