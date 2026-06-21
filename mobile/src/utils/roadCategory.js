/** Speed thresholds for on-device road-category heuristics (mph). */

import { durationMs } from './time';

export const ROAD_CATEGORY = {
  LOCAL: 'local',
  HIGHWAY: 'highway',
  UNKNOWN: 'unknown',
};

/** Min share of session with valid local/highway GPS intervals before we categorize. */
export const ROAD_CATEGORY_MIN_GPS_COVERAGE = 0.5;

export const ROAD_CATEGORY_INSUFFICIENT_DATA = 'Insufficient data';

export const ROAD_CATEGORY_INSUFFICIENT_DATA_HINT =
  'More than half the session must have valid GPS samples to show a breakdown.';

const MPS_TO_MPH = 2.23694;
const HIGHWAY_MIN_MPH = 55;
const MS_PER_MINUTE = 60000;

export function metersPerSecondToMph(speedMps) {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) {
    return null;
  }
  return Math.round(speedMps * MPS_TO_MPH);
}

/**
 * Classify road category from GPS speed (m/s). Expo returns -1 when unavailable.
 * Below highway threshold counts as local (includes idle time in the driveway).
 */
export function classifyRoadCategoryFromSpeedMps(speedMps) {
  const mph = metersPerSecondToMph(speedMps);
  if (mph == null) return ROAD_CATEGORY.UNKNOWN;
  if (mph >= HIGHWAY_MIN_MPH) return ROAD_CATEGORY.HIGHWAY;
  return ROAD_CATEGORY.LOCAL;
}

export function roadCategoryLabel(roadCategory) {
  switch (roadCategory) {
    case ROAD_CATEGORY.HIGHWAY:
      return 'Highway';
    case ROAD_CATEGORY.LOCAL:
      return 'Local';
    default:
      return '—';
  }
}

export function formatSpeedMph(speedMps) {
  const mph = metersPerSecondToMph(speedMps);
  if (mph == null) return '—';
  return `${mph} mph`;
}

const NO_BREAKDOWN = { highwayRoadMinutes: null };

function trackableCategory(roadCategory) {
  if (roadCategory === ROAD_CATEGORY.HIGHWAY) return ROAD_CATEGORY.HIGHWAY;
  if (roadCategory === ROAD_CATEGORY.LOCAL) return ROAD_CATEGORY.LOCAL;
  return null;
}

function addCategoryMs(ms, category, tallies, countTowardCoverage) {
  if (ms <= 0 || !category) return;
  if (countTowardCoverage) {
    tallies.validSampleMs += ms;
  }
  if (category === ROAD_CATEGORY.HIGHWAY) {
    tallies.highwayRoadMs += ms;
  }
}

/** Gap between two samples: same category fills the gap; different splits 50/50. */
function assignGapMs(ms, leftCategory, rightCategory, tallies, countTowardCoverage) {
  if (ms <= 0) return;
  const left = trackableCategory(leftCategory);
  const right = trackableCategory(rightCategory);

  if (left && right && left === right) {
    addCategoryMs(ms, left, tallies, countTowardCoverage);
    return;
  }

  if (left && right && left !== right) {
    const firstHalf = Math.floor(ms / 2);
    const secondHalf = ms - firstHalf;
    addCategoryMs(firstHalf, left, tallies, countTowardCoverage);
    addCategoryMs(secondHalf, right, tallies, countTowardCoverage);
    return;
  }

  if (left) addCategoryMs(ms, left, tallies, countTowardCoverage);
  else if (right) addCategoryMs(ms, right, tallies, countTowardCoverage);
}

function msToMinutes(ms) {
  return Math.round(ms / MS_PER_MINUTE);
}

/**
 * Highway minutes when GPS coverage is sufficient (mirrors nightMinutes).
 * Session durationMinutes is total; local = duration − highwayRoadMinutes.
 * Coverage gate uses inter-sample gaps only (lead-in and tail excluded from threshold).
 * Full breakdown includes lead-in and tail from nearest sample when gate passes.
 * Gaps use millisecond precision so ~5s GPS samples accumulate correctly.
 */
export function computeRoadCategoryMinutes(startedAt, endedAt, samples) {
  const totalMs = durationMs(startedAt, endedAt);
  if (totalMs <= 0 || !samples?.length) {
    return NO_BREAKDOWN;
  }

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  if (endMs <= startMs) {
    return NO_BREAKDOWN;
  }

  const inRange = samples
    .filter((sample) => {
      const t = new Date(sample.recordedAt).getTime();
      return t >= startMs && t <= endMs;
    })
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  if (inRange.length === 0) {
    return NO_BREAKDOWN;
  }

  const coverageTallies = { highwayRoadMs: 0, validSampleMs: 0 };

  for (let i = 0; i < inRange.length - 1; i += 1) {
    const gapMs = durationMs(inRange[i].recordedAt, inRange[i + 1].recordedAt);
    assignGapMs(gapMs, inRange[i].roadCategory, inRange[i + 1].roadCategory, coverageTallies, true);
  }

  const tailMs = durationMs(inRange[inRange.length - 1].recordedAt, endedAt);

  if (coverageTallies.validSampleMs / totalMs < ROAD_CATEGORY_MIN_GPS_COVERAGE) {
    return NO_BREAKDOWN;
  }

  const breakdown = { highwayRoadMs: 0, validSampleMs: 0 };

  const leadInMs = durationMs(startedAt, inRange[0].recordedAt);
  assignGapMs(leadInMs, inRange[0].roadCategory, null, breakdown, false);

  for (let i = 0; i < inRange.length - 1; i += 1) {
    const gapMs = durationMs(inRange[i].recordedAt, inRange[i + 1].recordedAt);
    assignGapMs(gapMs, inRange[i].roadCategory, inRange[i + 1].roadCategory, breakdown, false);
  }

  assignGapMs(tailMs, inRange[inRange.length - 1].roadCategory, null, breakdown, false);

  return { highwayRoadMinutes: msToMinutes(breakdown.highwayRoadMs) };
}

/** Local road minutes derived from session duration − highway (like day = duration − night). */
export function localRoadMinutesFromHighway(durationMinutesValue, highwayRoadMinutes) {
  if (!hasRoadCategoryBreakdown(highwayRoadMinutes)) return null;
  return Math.max(0, Number(durationMinutesValue ?? 0) - Number(highwayRoadMinutes));
}

export function hasRoadCategoryBreakdown(highwayRoadMinutes) {
  return highwayRoadMinutes != null;
}

/** Review / export label when breakdown exists. Mixed sessions use two lines (local, then highway). */
export function formatRoadCategorySummary(durationMinutesValue, highwayRoadMinutes) {
  if (!hasRoadCategoryBreakdown(highwayRoadMinutes)) {
    return ROAD_CATEGORY_INSUFFICIENT_DATA;
  }

  const total = Number(durationMinutesValue ?? 0);
  const highway = Number(highwayRoadMinutes);
  const local = total - highway;

  if (total <= 0) return '—';
  if (highway <= 0) return 'Local';
  if (local <= 0) return 'Highway';
  return `${local} min local\n${highway} min highway`;
}
