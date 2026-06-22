import { formatDate, formatDateTime, formatDuration, addMonths } from './time';
import { formatDayNightSummary } from './dayNight';
import { formatRoadCategorySummary, hasRoadCategoryBreakdown } from './roadCategory';
import { IL_RULES, hoursFromMinutes } from '../config/states/IL';

export function renderExportTemplate(sessionRows, user, options = {}) {
  const includeRoadCategory = options.includeRoadCategory === true;
  const lines = [];
  lines.push('Bound for the Road — Illinois Supervised Driving Log');
  lines.push('==========================================');
  lines.push('');
  lines.push(`Driver: ${user.legalName}`);
  if (user.permitIssueDate) {
    lines.push(`Expected permit date: ${formatDate(user.permitIssueDate)}`);
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
    lines.push(`  Day/Night: ${formatDayNightSummary(s.durationMinutes, s.nightMinutes)}`);
    if (s.timeInvalid) {
      lines.push('  Status: Excluded — overlapping times with another session');
    }
    if (
      includeRoadCategory &&
      hasRoadCategoryBreakdown(s.highwayRoadMinutes)
    ) {
      const summary = formatRoadCategorySummary(s.durationMinutes, s.highwayRoadMinutes);
      lines.push(`  Road category: ${summary.replace(/\n/g, '\n  ')}`);
    }
    if (s.notes) lines.push(`  Notes: ${s.notes}`);
  });

  const totalMin = sessionRows.reduce(
    (sum, s) => sum + (s.timeInvalid ? 0 : (s.durationMinutes ?? 0)),
    0,
  );
  const nightMin = sessionRows.reduce(
    (sum, s) => sum + (s.timeInvalid ? 0 : (s.nightMinutes ?? 0)),
    0,
  );

  lines.push('');
  lines.push('Totals');
  lines.push('------');
  lines.push(`Total practice: ${hoursFromMinutes(totalMin)} / ${IL_RULES.totalHours} hours`);
  lines.push(`Night practice: ${hoursFromMinutes(nightMin)} / ${IL_RULES.nightHours} hours`);
  lines.push('');
  lines.push('Disclaimer: Summarized for convenience. Confirm requirements with Illinois SOS.');

  return lines.join('\n');
}
