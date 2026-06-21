import {
  computeRoadCategoryMinutes,
  formatRoadCategorySummary,
  hasRoadCategoryBreakdown,
  localRoadMinutesFromHighway,
  ROAD_CATEGORY,
  ROAD_CATEGORY_INSUFFICIENT_DATA,
  ROAD_CATEGORY_MIN_GPS_COVERAGE,
} from '../../src/utils/roadCategory';

describe('roadCategory aggregation', () => {
  test('computeRoadCategoryMinutes stores highway only; local derived from duration', () => {
    const startedAt = '2026-06-01T14:00:00.000Z';
    const endedAt = '2026-06-01T15:00:00.000Z';
    const samples = [
      { recordedAt: '2026-06-01T14:10:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
      { recordedAt: '2026-06-01T14:40:00.000Z', roadCategory: ROAD_CATEGORY.HIGHWAY },
    ];
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBe(35);
    expect(localRoadMinutesFromHighway(60, result.highwayRoadMinutes)).toBe(25);
  });

  test('computeRoadCategoryMinutes fills agreeing gap between samples', () => {
    const startedAt = '2026-06-01T14:00:00.000Z';
    const endedAt = '2026-06-01T15:00:00.000Z';
    const samples = [
      { recordedAt: '2026-06-01T14:10:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
      { recordedAt: '2026-06-01T14:40:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
    ];
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBe(0);
    expect(localRoadMinutesFromHighway(60, result.highwayRoadMinutes)).toBe(60);
  });

  test('computeRoadCategoryMinutes splits disagreeing gap fifty-fifty', () => {
    const startedAt = '2026-06-01T14:00:00.000Z';
    const endedAt = '2026-06-01T14:30:00.000Z';
    const samples = [
      { recordedAt: '2026-06-01T14:05:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
      { recordedAt: '2026-06-01T14:25:00.000Z', roadCategory: ROAD_CATEGORY.HIGHWAY },
    ];
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBe(15);
    expect(localRoadMinutesFromHighway(30, result.highwayRoadMinutes)).toBe(15);
  });

  test('tail does not count toward coverage gate (only inter-sample gaps)', () => {
    const startedAt = '2026-06-01T14:00:00.000Z';
    const endedAt = '2026-06-01T15:00:00.000Z';
    const samples = [
      { recordedAt: '2026-06-01T14:10:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
      { recordedAt: '2026-06-01T14:25:00.000Z', roadCategory: ROAD_CATEGORY.HIGHWAY },
    ];
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBeNull();
  });

  test('lead-in uses first sample when coverage gate passes', () => {
    const startedAt = '2026-06-01T14:00:00.000Z';
    const endedAt = '2026-06-01T15:00:00.000Z';
    const samples = [
      { recordedAt: '2026-06-01T14:10:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
      { recordedAt: '2026-06-01T14:40:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
    ];
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBe(0);
    expect(localRoadMinutesFromHighway(60, result.highwayRoadMinutes)).toBe(60);
  });

  test('computeRoadCategoryMinutes returns null below GPS coverage threshold', () => {
    const startedAt = '2026-06-01T14:00:00.000Z';
    const endedAt = '2026-06-01T15:00:00.000Z';
    const samples = [
      { recordedAt: '2026-06-01T14:55:00.000Z', roadCategory: ROAD_CATEGORY.LOCAL },
    ];
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBeNull();
  });

  test('computeRoadCategoryMinutes ignores samples outside edited window', () => {
    const startedAt = '2026-06-01T14:30:00.000Z';
    const endedAt = '2026-06-01T15:00:00.000Z';
    const samples = [
      { recordedAt: '2026-06-01T14:10:00.000Z', roadCategory: ROAD_CATEGORY.HIGHWAY },
    ];
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBeNull();
  });

  test('formatRoadCategorySummary compact labels', () => {
    expect(formatRoadCategorySummary(60, 0)).toBe('Local');
    expect(formatRoadCategorySummary(60, 60)).toBe('Highway');
    expect(formatRoadCategorySummary(60, 20)).toBe('40 min local\n20 min highway');
    expect(formatRoadCategorySummary(60, null)).toBe(ROAD_CATEGORY_INSUFFICIENT_DATA);
  });

  test('hasRoadCategoryBreakdown requires stored highway value', () => {
    expect(hasRoadCategoryBreakdown(null)).toBe(false);
    expect(hasRoadCategoryBreakdown(20)).toBe(true);
  });

  test('coverage threshold is 50%', () => {
    expect(ROAD_CATEGORY_MIN_GPS_COVERAGE).toBe(0.5);
  });

  test('dense ~5s GPS samples pass coverage gate for a 17 min session', () => {
    const startedAt = '2026-06-01T14:00:00.000Z';
    const endedAt = '2026-06-01T14:17:00.000Z';
    const samples = [];
    const startMs = new Date(startedAt).getTime();
    const endMs = new Date(endedAt).getTime();
    for (let t = startMs + 30_000; t < endMs - 30_000; t += 5000) {
      samples.push({
        recordedAt: new Date(t).toISOString(),
        roadCategory: ROAD_CATEGORY.LOCAL,
      });
    }
    const result = computeRoadCategoryMinutes(startedAt, endedAt, samples);
    expect(result.highwayRoadMinutes).toBe(0);
    expect(localRoadMinutesFromHighway(17, result.highwayRoadMinutes)).toBe(17);
  });
});
