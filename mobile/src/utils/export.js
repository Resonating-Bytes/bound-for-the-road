import { formatDate, formatDateTime, formatDuration, addMonths } from './time';
import { dayNightLabel } from './dayNight';
import { truncateHash } from './hash';
import { IL_RULES, hoursFromMinutes } from '../config/states/IL';

export function renderExportTemplate(sessionRows, user) {
  const lines = [];
  lines.push('TeenDriver — Illinois Supervised Driving Log');
  lines.push('==========================================');
  lines.push('');
  lines.push(`Driver: ${user.legalName}`);
  if (user.permitIssueDate) {
    lines.push(`Permit issue date: ${formatDate(user.permitIssueDate)}`);
    lines.push(
      `Earliest license eligibility (9 months): ${formatDate(addMonths(user.permitIssueDate, IL_RULES.holdingMonths))}`,
    );
  }
  lines.push(`State: ${user.stateCode ?? 'IL'}`);
  lines.push(`Exported: ${formatDateTime(new Date().toISOString())}`);
  lines.push('');
  lines.push('Sessions');
  lines.push('--------');

  if (sessionRows.length === 0) {
    lines.push('(No saved sessions)');
  }

  sessionRows.forEach((s, i) => {
    lines.push('');
    lines.push(`#${i + 1}`);
    lines.push(`  Date: ${formatDate(s.startedAt)}`);
    lines.push(`  Start: ${formatDateTime(s.startedAt)}`);
    lines.push(`  End: ${formatDateTime(s.endedAt)}`);
    lines.push(`  Duration: ${formatDuration(s.durationMinutes ?? 0)}`);
    lines.push(`  Day/Night: ${dayNightLabel(s.dayNight)}`);
    if (s.notes) lines.push(`  Notes: ${s.notes}`);
    if (s.requestHash) lines.push(`  Record hash: ${truncateHash(s.requestHash)}…`);
  });

  const totalMin = sessionRows.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const nightMin = sessionRows
    .filter((s) => s.dayNight === 'night')
    .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

  lines.push('');
  lines.push('Totals');
  lines.push('------');
  lines.push(`Total practice: ${hoursFromMinutes(totalMin)} / ${IL_RULES.totalHours} hours`);
  lines.push(`Night practice: ${hoursFromMinutes(nightMin)} / ${IL_RULES.nightHours} hours`);
  lines.push('');
  lines.push('Disclaimer: Summarized for convenience. Confirm requirements with Illinois SOS.');

  return lines.join('\n');
}
