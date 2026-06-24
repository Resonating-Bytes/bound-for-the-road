import { getActiveLinksForUser } from '../db/queries';

/**
 * Linked adult user ids for a teen (active links only).
 * @param {string} teenUserId
 * @returns {string[]}
 */
export function listLinkedAdultIdsForTeen(teenUserId) {
  return getActiveLinksForUser(teenUserId)
    .filter((link) => link.teenUserId === teenUserId)
    .map((link) => link.adultUserId);
}

/**
 * Resolve which linked adults should receive session_submitted push.
 * Server applies the same rules and intersects with linked adults (see docs/PROXIMITY.md).
 *
 * 1. Closest nearby linked adult reported by client at submit (GPS + foreground adult response)
 * 2. All linked adults (fallback when no teen location, no responses, or none in radius)
 *
 * @param {object} options
 * @param {string[]} options.linkedAdultIds
 * @param {string[] | null | undefined} options.nearbyAdultIds
 * @returns {string[]}
 */
export function resolveSessionSubmitPushRecipients({ linkedAdultIds, nearbyAdultIds }) {
  const linked = [...new Set(linkedAdultIds ?? [])];
  if (!linked.length) return [];

  const nearby = (nearbyAdultIds ?? []).filter((id) => linked.includes(id));
  if (nearby.length) {
    return [...new Set(nearby)];
  }

  return linked;
}
