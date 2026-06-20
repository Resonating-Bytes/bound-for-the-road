/** Snapshot session fields for restore on edit cancel. */
export function createSessionEditBackup(session) {
  if (!session) return null;
  return {
    requestHash: session.requestHash,
    payloadJson: session.payloadJson,
    notes: session.notes,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes: session.durationMinutes,
    dayNight: session.dayNight,
  };
}
