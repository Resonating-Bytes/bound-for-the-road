import { parseISODate, toISODateOnly, formatDate } from './time';

export const PERMIT_DATE_FIELD_LABEL = 'Expected permit date';
export const PERMIT_DATE_HINT = 'You can change this later in Settings → Profile.';
export const PERMIT_DATE_SETTINGS_HINT =
  'Used for your license eligibility date. You can update this when you get your permit.';

const MAX_PERMIT_YEARS_AHEAD = 1;

/** Latest selectable expected permit date (today + 1 year). */
export function permitPickerMaximumDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + MAX_PERMIT_YEARS_AHEAD);
  return d;
}

/** True when today is on or after the expected permit date (local calendar day). */
export function isPermitActive(permitIssueDate) {
  if (!permitIssueDate) return false;
  const permitDay = parseISODate(permitIssueDate);
  const today = parseISODate(toISODateOnly(new Date()));
  return today.getTime() >= permitDay.getTime();
}

export function formatPermitStartsMessage(permitIssueDate) {
  return `Practice logging starts ${formatDate(permitIssueDate)} when your learner's permit begins.`;
}
