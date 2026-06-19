import { formatDate } from './time';
import { getFirstName } from './displayName';

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
    approverNameFirstOnly = true,
    pendingRemoteSync = false,
    canRemoteWrite = true,
  },
) {
  if (!session || session.status !== 'saved') {
    return { key: 'draft', label: 'Not submitted' };
  }

  if (approval && approval.requestHash === session.requestHash) {
    const fallback = approverName ?? 'Supervisor';
    const name = approverNameFirstOnly ? getFirstName(fallback) : fallback;
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
    const label = canRemoteWrite
      ? 'Saved on device — ready to send for approval'
      : 'Saved on device — update app to send for approval';
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
