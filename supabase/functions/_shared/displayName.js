/** First token of legal name (e.g. "Jane Doe" → "Jane"). */
export function firstTokenFromLegalName(legalName) {
  const trimmed = (legalName ?? '').trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

/** Casual label: nickname override, else display name, else first token of legal name. */
export function casualLabel({ nickname, displayName, legalName, fallback = 'Driver' }) {
  const nick = (nickname ?? '').trim();
  if (nick) return nick;
  const display = (displayName ?? '').trim();
  if (display) return display;
  const first = firstTokenFromLegalName(legalName);
  return first || fallback;
}

export async function fetchUserProfilesByIds(supabaseAdmin, userIds) {
  if (!userIds.length) return new Map();
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, display_name, legal_name')
    .in('id', userIds);
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.id, {
      displayName: row.display_name?.trim() ?? '',
      legalName: row.legal_name?.trim() ?? '',
    });
  }
  return map;
}

export async function fetchNicknameForTarget(supabaseAdmin, ownerUserId, targetUserId) {
  const { data, error } = await supabaseAdmin
    .from('user_aliases')
    .select('nickname')
    .eq('owner_user_id', ownerUserId)
    .eq('target_user_id', targetUserId)
    .maybeSingle();
  if (error) throw error;
  return data?.nickname?.trim() ?? '';
}

export async function casualLabelForLinkedUser(
  supabaseAdmin,
  viewerUserId,
  targetUserId,
  fallback,
) {
  const profiles = await fetchUserProfilesByIds(supabaseAdmin, [targetUserId]);
  const profile = profiles.get(targetUserId) ?? { displayName: '', legalName: '' };
  const nickname = await fetchNicknameForTarget(supabaseAdmin, viewerUserId, targetUserId);
  return casualLabel({
    nickname,
    displayName: profile.displayName,
    legalName: profile.legalName,
    fallback,
  });
}
