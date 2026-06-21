import {
  classifyRoadCategoryFromSpeedMps,
  formatSpeedMph,
  metersPerSecondToMph,
  roadCategoryLabel,
  ROAD_CATEGORY,
} from '../../src/utils/roadCategory';

describe('roadCategory', () => {
  test('metersPerSecondToMph converts and rejects invalid', () => {
    expect(metersPerSecondToMph(0)).toBe(0);
    expect(metersPerSecondToMph(10)).toBe(22);
    expect(metersPerSecondToMph(-1)).toBeNull();
    expect(metersPerSecondToMph(null)).toBeNull();
  });

  test('classifyRoadCategoryFromSpeedMps uses 55 mph highway threshold', () => {
    expect(classifyRoadCategoryFromSpeedMps(0)).toBe(ROAD_CATEGORY.LOCAL);
    expect(classifyRoadCategoryFromSpeedMps(5)).toBe(ROAD_CATEGORY.LOCAL);
    expect(classifyRoadCategoryFromSpeedMps(18)).toBe(ROAD_CATEGORY.LOCAL);
    expect(classifyRoadCategoryFromSpeedMps(25)).toBe(ROAD_CATEGORY.HIGHWAY);
    expect(classifyRoadCategoryFromSpeedMps(-1)).toBe(ROAD_CATEGORY.UNKNOWN);
    expect(classifyRoadCategoryFromSpeedMps(null)).toBe(ROAD_CATEGORY.UNKNOWN);
  });

  test('formatSpeedMph and roadCategoryLabel', () => {
    expect(formatSpeedMph(10)).toBe('22 mph');
    expect(formatSpeedMph(-1)).toBe('—');
    expect(roadCategoryLabel(ROAD_CATEGORY.HIGHWAY)).toBe('Highway');
    expect(roadCategoryLabel(ROAD_CATEGORY.LOCAL)).toBe('Local');
    expect(roadCategoryLabel(ROAD_CATEGORY.UNKNOWN)).toBe('—');
  });
});
