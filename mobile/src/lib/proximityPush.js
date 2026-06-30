import { getActiveLinksForUser } from '../db/queries';
import { getSupabase, isSupabaseConfigured } from './supabase';

/**
 * Linked supervisor user ids for a teen (active links — adults and instructors).
 * @param {string} teenUserId
 * @returns {string[]}
 */
export function listLinkedAdultIdsForTeen(teenUserId) {
  const adultIds = getActiveLinksForUser(teenUserId)
    .filter((link) => link.teenUserId === teenUserId)
    .map((link) => link.adultUserId);
  return [...new Set(adultIds)];
}

/**
 * Roles for linked supervisors (from Supabase). Unknown ids default to `adult`.
 *
 * @param {string[]} linkedSupervisorIds
 * @returns {Promise<Record<string, 'adult' | 'instructor'>>}
 */
export async function fetchLinkedSupervisorRoles(linkedSupervisorIds) {
  const uniqueIds = [...new Set(linkedSupervisorIds ?? [])];
  if (!uniqueIds.length) return {};

  if (!isSupabaseConfigured()) {
    return Object.fromEntries(uniqueIds.map((id) => [id, 'adult']));
  }

  const { data, error } = await getSupabase().from('users').select('id, role').in('id', uniqueIds);
  if (error) throw error;

  const roles = {};
  for (const row of data ?? []) {
    roles[row.id] = row.role === 'instructor' ? 'instructor' : 'adult';
  }
  for (const id of uniqueIds) {
    if (!roles[id]) roles[id] = 'adult';
  }
  return roles;
}

/**
 * Resolve which linked supervisors should receive session_submitted push.
 * Server applies the same rules and intersects with linked accounts (see docs/PROXIMITY.md).
 *
 * 1. Single nearby supervisor from client (GPS + Realtime; instructor beats parent when both in radius)
 * 2. All linked supervisors (fallback when no teen location, no responses, or none in radius)
 *
 * @param {object} options
 * @param {string[]} options.linkedAdultIds
 * @param {string[] | null | undefined} options.nearbyAdultIds — at most one id from proximity collection
 * @returns {string[]}
 */
export function resolveSessionSubmitPushRecipients({ linkedAdultIds, nearbyAdultIds }) {
  const linked = [...new Set(linkedAdultIds ?? [])];
  if (!linked.length) return [];

  const nearby = (Array.isArray(nearbyAdultIds) ? nearbyAdultIds : []).filter((id) =>
    linked.includes(id),
  );
  if (nearby.length) {
    return [nearby[0]];
  }

  return linked;
}
