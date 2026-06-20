import { formatDate } from './time';

function isOtherAdultInCar(item) {
  if (item.approverPresent === 'other_adult') return true;
  if (item.approverPresent === 'co_present') return false;
  // Legacy rows: joined_session false means another adult was in the vehicle.
  if (item.joinedSession === false) return true;
  return false;
}

/** Adult dashboard line for an approved session row. */
export function formatAdultApprovedLabel(item, viewerUserId) {
  const date = formatDate(item.approvedAt);
  const name = item.approverName ?? 'Supervisor';

  if (isOtherAdultInCar(item)) {
    return `Approved by ${name}, ${date}`;
  }
  if (item.approvedByUserId === viewerUserId) {
    return `You approved, ${date}`;
  }
  return `Approved by ${name}, ${date}`;
}
