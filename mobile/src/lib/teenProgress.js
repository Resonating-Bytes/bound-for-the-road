import { getSupabase, isSupabaseConfigured } from './supabase';
import { fetchLinkedPartners } from './links';
import { addMonths } from '../utils/time';
import { IL_RULES } from '../config/states/IL';

export function aggregateSessionProgress(rows = []) {
  let totalMinutes = 0;
  let nightMinutes = 0;
  for (const row of rows) {
    const mins = Number(row.duration_minutes ?? row.durationMinutes ?? 0);
    totalMinutes += mins;
    const dayNight = row.day_night ?? row.dayNight;
    if (dayNight === 'night') nightMinutes += mins;
  }
  return { totalMinutes, nightMinutes, dayMinutes: totalMinutes - nightMinutes };
}

export async function fetchProgressForTeens(teenUserIds) {
  if (!isSupabaseConfigured() || !teenUserIds.length) {
    return Object.fromEntries(teenUserIds.map((id) => [id, { totalMinutes: 0, nightMinutes: 0, dayMinutes: 0 }]));
  }

  const { data, error } = await getSupabase()
    .from('sessions')
    .select('teen_user_id, duration_minutes, day_night')
    .in('teen_user_id', teenUserIds)
    .eq('status', 'saved')
    .is('deleted_at', null);

  if (error) throw error;

  const byTeen = Object.fromEntries(
    teenUserIds.map((id) => [id, { totalMinutes: 0, nightMinutes: 0, dayMinutes: 0 }]),
  );

  for (const row of data ?? []) {
    const teenId = row.teen_user_id;
    if (!byTeen[teenId]) continue;
    const mins = Number(row.duration_minutes ?? 0);
    byTeen[teenId].totalMinutes += mins;
    if (row.day_night === 'night') byTeen[teenId].nightMinutes += mins;
    byTeen[teenId].dayMinutes = byTeen[teenId].totalMinutes - byTeen[teenId].nightMinutes;
  }

  return byTeen;
}

/** Progress + eligibility for each teen linked to this adult account. */
export async function fetchLinkedTeenSummaries(adultUserId) {
  const partners = await fetchLinkedPartners(adultUserId);
  if (!partners.length) return [];

  const teenIds = partners.map((p) => p.partnerId);
  const progressByTeen = await fetchProgressForTeens(teenIds);

  let profileById = {};
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from('users')
      .select('id, permit_issue_date')
      .in('id', teenIds);
    if (!error && data) {
      profileById = Object.fromEntries(data.map((row) => [row.id, row]));
    }
  }

  return partners.map((partner) => {
    const permitIssueDate = profileById[partner.partnerId]?.permit_issue_date ?? null;
    return {
      teenUserId: partner.partnerId,
      name: partner.name,
      progress: progressByTeen[partner.partnerId] ?? {
        totalMinutes: 0,
        nightMinutes: 0,
        dayMinutes: 0,
      },
      eligibility: permitIssueDate ? addMonths(permitIssueDate, IL_RULES.holdingMonths) : null,
    };
  });
}
