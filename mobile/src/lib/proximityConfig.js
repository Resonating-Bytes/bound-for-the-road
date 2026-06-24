/** Max distance (meters) between teen submit location and adult response for targeted push. */
export const PROXIMITY_PUSH_RADIUS_METERS = 400;

/** How long the teen client waits for adult location responses before sending push. */
export const PROXIMITY_RESPONSE_WAIT_MS = 4500;

export const PROXIMITY_BROADCAST_REQUEST = 'proximity_request';
export const PROXIMITY_BROADCAST_RESPONSE = 'proximity_response';

export function proximityChannelName(teenUserId) {
  return `proximity:teen:${teenUserId}`;
}
