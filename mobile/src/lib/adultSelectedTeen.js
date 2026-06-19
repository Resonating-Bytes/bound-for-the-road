import { getSettingValue, setSettingValue } from '../db/queries';
import { getDb } from '../db/client';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

/** Per-adult dashboard context: which linked teen is in view. */
export const ADULT_SELECTED_TEEN_SETTING = 'adult_selected_teen_id';

export function adultSelectedTeenSettingKey(adultUserId) {
  return `${ADULT_SELECTED_TEEN_SETTING}_${adultUserId}`;
}

export function readSavedSelectedTeenId(adultUserId) {
  if (!adultUserId) return null;
  return getSettingValue(adultSelectedTeenSettingKey(adultUserId));
}

export function writeSelectedTeenId(adultUserId, teenUserId) {
  if (!adultUserId || !teenUserId) return;
  setSettingValue(adultSelectedTeenSettingKey(adultUserId), teenUserId);
}

/** Pick a valid teen id from linked list; prefer saved selection, else first linked teen. */
export function resolveSelectedTeenId(linkedTeenIds, savedTeenId) {
  if (!linkedTeenIds?.length) return null;
  if (savedTeenId && linkedTeenIds.includes(savedTeenId)) return savedTeenId;
  return linkedTeenIds[0];
}

export function clearAdultSelectedTeen(adultUserId) {
  if (!adultUserId) return;
  getDb()
    .delete(settings)
    .where(eq(settings.key, adultSelectedTeenSettingKey(adultUserId)))
    .run();
}
