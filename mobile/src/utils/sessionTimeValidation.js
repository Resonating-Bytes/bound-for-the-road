/** Overlap detection for saved session time ranges (same teen). */

import { formatDate, formatDateTime } from './time';

export const SESSION_TIME_OVERLAP_HINT =
  'This session overlaps another saved session. Edit the times to resolve.';

export function sessionIntervalsOverlap(startA, endA, startB, endB) {
  const a0 = new Date(startA).getTime();
  const a1 = new Date(endA).getTime();
  const b0 = new Date(startB).getTime();
  const b1 = new Date(endB).getTime();
  if (!Number.isFinite(a0) || !Number.isFinite(a1) || !Number.isFinite(b0) || !Number.isFinite(b1)) {
    return false;
  }
  if (a1 <= a0 || b1 <= b0) return false;
  return a0 < b1 && b0 < a1;
}

function sortBySessionStart(a, b) {
  const startDiff = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
  if (startDiff !== 0) return startDiff;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * Given saved sessions with start/end, return ids that should be timeInvalid.
 * In each overlap group, the oldest session (earliest start, then createdAt) stays valid.
 */
export function computeInvalidSessionIds(savedSessions) {
  const eligible = (savedSessions ?? []).filter((s) => s.startedAt && s.endedAt);
  if (eligible.length < 2) return new Set();

  const sorted = [...eligible].sort(sortBySessionStart);
  const parent = new Map(sorted.map((s) => [s.id, s.id]));

  function find(id) {
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)));
    return parent.get(id);
  }

  function union(a, b) {
    parent.set(find(a), find(b));
  }

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (
        sessionIntervalsOverlap(
          sorted[i].startedAt,
          sorted[i].endedAt,
          sorted[j].startedAt,
          sorted[j].endedAt,
        )
      ) {
        union(sorted[i].id, sorted[j].id);
      }
    }
  }

  const groups = new Map();
  for (const session of sorted) {
    const root = find(session.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(session);
  }

  const invalid = new Set();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort(sortBySessionStart);
    for (let i = 1; i < group.length; i += 1) {
      invalid.add(group[i].id);
    }
  }

  return invalid;
}

/** Saved sessions whose times overlap the proposed range (excludes sessionId). */
export function findConflictingSessions(sessionId, startedAt, endedAt, savedSessions) {
  if (!startedAt || !endedAt) return [];
  return (savedSessions ?? []).filter(
    (s) =>
      s.id !== sessionId &&
      s.startedAt &&
      s.endedAt &&
      sessionIntervalsOverlap(startedAt, endedAt, s.startedAt, s.endedAt),
  );
}

export function formatOverlapConflictMessage(conflicts) {
  if (!conflicts?.length) return null;
  if (conflicts.length === 1) {
    const s = conflicts[0];
    return `Overlaps saved session on ${formatDate(s.startedAt)} (${formatDateTime(s.startedAt)} – ${formatDateTime(s.endedAt)}). Edit the times or fix that session.`;
  }
  const dates = conflicts.map((s) => formatDate(s.startedAt)).join(', ');
  return `Overlaps ${conflicts.length} saved sessions (${dates}). Edit the times or fix those sessions.`;
}
