import { formatDate } from './time';
import { getPrimaryInvalidHint, sessionHasBlockingInvalid } from './sessionValidation';

/**
 * Derive Phase 2 display status for a saved session row.
 */
export function getSessionDisplayStatus(
  session,
  {
    submission,
    approval,
    latestApproval,
    approverName,
    pendingRemoteSync = false,
    canRemoteWrite = true,
  },
) {
  if (!session || session.status !== 'saved') {
    return { key: 'draft', label: 'Not submitted' };
  }

  if (sessionHasBlockingInvalid(session)) {
    const hint =
      getPrimaryInvalidHint(session, 'teen') ??
      (submission && !submission.superseded
        ? 'Session needs a fix before your supervisor can approve'
        : 'Session needs a fix');
    return {
      key: 'time_invalid',
      label: hint,
      ...(submission && !submission.superseded ? { submission } : {}),
    };
  }

  if (approval && approval.requestHash === session.requestHash) {
    const name = approverName ?? 'Supervisor';
    return {
      key: 'approved',
      label: `Approved by ${name}, ${formatDate(approval.approvedAt)}`,
      approval,
    };
  }

  if (latestApproval && latestApproval.requestHash !== session.requestHash) {
    return {
      key: 'superseded',
      label: 'Superseded — approval on prior version',
    };
  }

  if (submission && !submission.superseded && pendingRemoteSync) {
    const label = !canRemoteWrite
      ? 'Saved on device — update app to send for approval'
      : 'Saved on device — pending sync';
    return {
      key: 'saved_local',
      label,
      submission,
    };
  }

  if (submission && !submission.superseded) {
    return { key: 'pending', label: 'Pending approval', submission };
  }

  if (!session.requestHash) {
    return { key: 'needs_revision', label: 'Revision requested' };
  }

  return { key: 'pending', label: 'Pending approval' };
}
