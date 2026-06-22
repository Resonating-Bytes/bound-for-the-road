/**
 * Session validity flags and teen-facing hints (local-only; never synced to server).
 * Today: `timeInvalid` on the session row maps to TIME_OVERLAP.
 */

export const SESSION_INVALID_REASONS = {
  TIME_OVERLAP: 'time_overlap',
};

export const INVALID_SESSIONS_SECTION_TITLE = 'Fix before approval';

const HINTS = {
  teen: {
    [SESSION_INVALID_REASONS.TIME_OVERLAP]:
      'Overlapping times — edit this session or discard it.',
  },
};

/** Reasons that block supervisor approval (any one is enough). */
export function getSessionInvalidReasons(session) {
  if (!session) return [];
  const reasons = [];
  if (session.timeInvalid) {
    reasons.push(SESSION_INVALID_REASONS.TIME_OVERLAP);
  }
  return reasons;
}

export function sessionHasBlockingInvalid(session) {
  return getSessionInvalidReasons(session).length > 0;
}

export function getSessionInvalidHints(session, audience = 'teen') {
  const table = HINTS[audience] ?? HINTS.teen;
  return getSessionInvalidReasons(session)
    .map((reason) => table[reason])
    .filter(Boolean);
}

export function getPrimaryInvalidHint(session, audience = 'teen') {
  return getSessionInvalidHints(session, audience)[0] ?? null;
}
