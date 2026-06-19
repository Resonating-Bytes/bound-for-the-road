import { formatDate } from './time';

/**
 * Derive Phase 2 display status for a saved session row.
 */
export function getSessionDisplayStatus(session, { submission, approval, latestApproval, approverName }) {
  if (!session || session.status !== 'saved') {
    return { key: 'draft', label: 'Not submitted' };
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

  if (submission && !submission.superseded) {
    return { key: 'pending', label: 'Pending approval', submission };
  }

  if (session.requestHash) {
    return { key: 'pending', label: 'Pending approval' };
  }

  return { key: 'draft', label: 'Not submitted' };
}
