import { INVALID_SESSIONS_SECTION_TITLE } from './sessionValidation';

const SESSION_SORT = (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();

/** Group saved sessions for the teen dashboard list. */
export function groupSessionsForDashboard(sessions, statusBySessionId) {
  const invalid = [];
  const needsRevision = [];
  const pending = [];
  const approved = [];

  for (const session of sessions) {
    const status = statusBySessionId[session.id];
    if (status?.key === 'approved') {
      approved.push(session);
    } else if (status?.key === 'time_invalid') {
      invalid.push(session);
    } else if (status?.key === 'needs_revision') {
      needsRevision.push(session);
    } else {
      pending.push(session);
    }
  }

  invalid.sort(SESSION_SORT);
  pending.sort(SESSION_SORT);
  needsRevision.sort(SESSION_SORT);
  approved.sort(SESSION_SORT);

  const sections = [];
  if (invalid.length) {
    sections.push({ key: 'invalid', title: INVALID_SESSIONS_SECTION_TITLE, data: invalid });
  }
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

/** Group pending + approved rows for the adult dashboard. */
export function groupAdultDashboardSections(pending, approved) {
  const actionablePending = [...(pending ?? [])].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  const sections = [];
  if (actionablePending.length) {
    sections.push({ key: 'pending', title: 'Pending approval', data: actionablePending });
  }
  if (approved?.length) {
    sections.push({ key: 'approved', title: 'Approved', data: approved });
  }
  return sections;
}

/** Scope adult dashboard session rows to one linked teen. */
export function filterSubmissionsForTeen(rows, teenUserId) {
  if (!teenUserId) return rows ?? [];
  return (rows ?? []).filter((row) => row.session?.teenUserId === teenUserId);
}

/** Group pending rows for the instructor dashboard (pending only, student-grouped). */
export function groupInstructorDashboard(students, pendingByTeenId, sortMode = 'newest_pending') {
  const groups = (students ?? []).map((student) => {
    const pending = [...(pendingByTeenId[student.teenUserId] ?? [])].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    return {
      teenUserId: student.teenUserId,
      name: student.name,
      pending,
    };
  });

  if (sortMode === 'alphabetical') {
    return groups.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  const withPending = groups.filter((group) => group.pending.length > 0);
  withPending.sort((a, b) => {
    const aLatest = new Date(a.pending[0].submittedAt).getTime();
    const bLatest = new Date(b.pending[0].submittedAt).getTime();
    return bLatest - aLatest;
  });
  return withPending;
}

