const CENTROIDS = {
  'America/New_York': { lat: 40.7128, lon: -74.006 },
  'America/Chicago': { lat: 41.8781, lon: -87.6298 },
  'America/Denver': { lat: 39.7392, lon: -104.9903 },
  'America/Los_Angeles': { lat: 34.0522, lon: -118.2437 },
  'America/Phoenix': { lat: 33.4484, lon: -112.074 },
  'America/Anchorage': { lat: 61.2181, lon: -149.9003 },
  'Pacific/Honolulu': { lat: 21.3069, lon: -157.8583 },
};

const DEFAULT = { lat: 39.8283, lon: -98.5795 };

export function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  } catch {
    return 'America/Chicago';
  }
}

export function timezoneCentroid(timezone) {
  return CENTROIDS[timezone] ?? DEFAULT;
}
