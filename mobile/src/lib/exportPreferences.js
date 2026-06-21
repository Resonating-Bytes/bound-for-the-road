import { getSettingValue, setSettingValue } from '../db/queries';

/** Base name; persisted keys are per-user: `export_include_road_category_<userId>`. */
export const EXPORT_INCLUDE_ROAD_CATEGORY = 'export_include_road_category';

export function exportIncludeRoadCategoryKey(userId) {
  return `${EXPORT_INCLUDE_ROAD_CATEGORY}_${userId}`;
}

/** Default off — road category is optional in exported logs. */
export function readExportIncludeRoadCategory(userId) {
  if (!userId) return false;
  return getSettingValue(exportIncludeRoadCategoryKey(userId)) === '1';
}

export function writeExportIncludeRoadCategory(userId, enabled) {
  if (!userId) return;
  setSettingValue(exportIncludeRoadCategoryKey(userId), enabled ? '1' : '0');
}
