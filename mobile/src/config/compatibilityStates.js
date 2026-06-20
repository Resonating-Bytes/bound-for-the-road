/** First-class compatibility outcomes — used in runtime, UI labels, and tests. */

export const COMPATIBILITY_STATE = {
  COMPATIBLE: 'compatible',
  UPDATE_AVAILABLE: 'update_available',
  UPDATE_REQUIRED: 'update_required',
  BACKEND_STALE: 'backend_stale',
  CAPABILITY_MISSING: 'capability_missing',
  PAYLOAD_SCHEMA_UNSUPPORTED: 'payload_schema_unsupported',
  CHECK_SKIPPED: 'check_skipped',
  CHECK_ERROR: 'check_error',
  PREVIEW: 'preview',
};

/** Remote writes blocked for these states. */
export const WRITE_BLOCKED_STATES = new Set([
  COMPATIBILITY_STATE.UPDATE_REQUIRED,
  COMPATIBILITY_STATE.BACKEND_STALE,
  COMPATIBILITY_STATE.CAPABILITY_MISSING,
  COMPATIBILITY_STATE.PAYLOAD_SCHEMA_UNSUPPORTED,
  COMPATIBILITY_STATE.CHECK_ERROR,
  COMPATIBILITY_STATE.PREVIEW,
]);
