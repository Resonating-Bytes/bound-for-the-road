const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Haversine distance in meters between two WGS84 points. */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function isWithinRadiusMeters(lat1, lon1, lat2, lon2, radiusMeters) {
  return distanceMeters(lat1, lon1, lat2, lon2) <= radiusMeters;
}

/**
 * Single linked adult closest to the teen and within radius.
 * Tie-break: first in linkedAdultIds when distances are equal.
 *
 * @param {Map<string, { latitude: number, longitude: number }>} responses
 * @returns {string | null}
 */
export function pickClosestAdultWithinRadius(
  teenLat,
  teenLon,
  responses,
  linkedAdultIds,
  radiusMeters,
) {
  let closestId = null;
  let closestDistance = Infinity;

  for (const adultUserId of linkedAdultIds) {
    const adultLocation = responses.get(adultUserId);
    if (!adultLocation) continue;
    const d = distanceMeters(teenLat, teenLon, adultLocation.latitude, adultLocation.longitude);
    if (d <= radiusMeters && d < closestDistance) {
      closestDistance = d;
      closestId = adultUserId;
    }
  }

  return closestId;
}

/**
 * Pick one linked supervisor for proximity push.
 * Instructors in radius beat parents regardless of distance; else closest parent in radius.
 *
 * @param {Map<string, { latitude: number, longitude: number }>} responses
 * @param {Record<string, string>} roleByUserId — `adult` | `instructor`
 * @returns {string | null}
 */
export function pickProximityPushRecipient(
  teenLat,
  teenLon,
  responses,
  linkedSupervisorIds,
  roleByUserId,
  radiusMeters,
) {
  const instructorIds = linkedSupervisorIds.filter((id) => roleByUserId[id] === 'instructor');
  const parentIds = linkedSupervisorIds.filter((id) => roleByUserId[id] !== 'instructor');

  const closestInstructor = pickClosestAdultWithinRadius(
    teenLat,
    teenLon,
    responses,
    instructorIds,
    radiusMeters,
  );
  if (closestInstructor) return closestInstructor;

  return pickClosestAdultWithinRadius(teenLat, teenLon, responses, parentIds, radiusMeters);
}
