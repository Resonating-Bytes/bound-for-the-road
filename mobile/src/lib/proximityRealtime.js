import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  PROXIMITY_BROADCAST_REQUEST,
  PROXIMITY_BROADCAST_RESPONSE,
  proximityChannelName,
} from './proximityConfig';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForChannelSubscribe(channel, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('proximity channel subscribe timeout')), timeoutMs);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        reject(new Error(`proximity channel ${status}`));
      }
    });
  });
}

/**
 * Teen: broadcast location check and collect linked adult responses.
 *
 * @returns {Map<string, { latitude: number, longitude: number }>}
 */
export async function collectAdultProximityResponses({
  teenUserId,
  requestId,
  sessionId,
  latitude,
  longitude,
  linkedAdultIds,
  waitMs,
}) {
  if (!isSupabaseConfigured() || !linkedAdultIds.length) {
    return new Map();
  }

  const supabase = getSupabase();
  const channel = supabase.channel(proximityChannelName(teenUserId), {
    config: { broadcast: { ack: false, self: false } },
  });

  const responses = new Map();

  channel.on('broadcast', { event: PROXIMITY_BROADCAST_RESPONSE }, ({ payload }) => {
    if (!payload || payload.requestId !== requestId) return;
    const adultUserId = payload.adultUserId;
    if (!linkedAdultIds.includes(adultUserId)) return;
    const lat = Number(payload.latitude);
    const lon = Number(payload.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    responses.set(adultUserId, { latitude: lat, longitude: lon });
  });

  try {
    await waitForChannelSubscribe(channel);
    await channel.send({
      type: 'broadcast',
      event: PROXIMITY_BROADCAST_REQUEST,
      payload: {
        requestId,
        sessionId,
        teenUserId,
        latitude,
        longitude,
      },
    });
    await sleep(waitMs);
  } catch (e) {
    console.warn('Proximity response collection failed:', e.message ?? e);
  } finally {
    supabase.removeChannel(channel);
  }

  return responses;
}

/**
 * Adult (app foreground): respond to teen submit location checks for linked teens.
 *
 * @param {string} adultUserId
 * @param {string[]} linkedTeenIds
 * @param {(teenUserId: string) => Promise<{ latitude: number, longitude: number } | null>} getLocation
 * @returns {() => void} unsubscribe
 */
export function subscribeAdultProximityResponder(adultUserId, linkedTeenIds, getLocation) {
  if (!isSupabaseConfigured() || !linkedTeenIds.length) {
    return () => {};
  }

  const supabase = getSupabase();
  const channels = linkedTeenIds.map((teenUserId) => {
    const channel = supabase.channel(proximityChannelName(teenUserId), {
      config: { broadcast: { ack: false, self: false } },
    });

    channel.on('broadcast', { event: PROXIMITY_BROADCAST_REQUEST }, async ({ payload }) => {
      if (!payload || payload.teenUserId !== teenUserId) return;

      const coords = await getLocation();
      if (!coords) return;

      try {
        await channel.send({
          type: 'broadcast',
          event: PROXIMITY_BROADCAST_RESPONSE,
          payload: {
            requestId: payload.requestId,
            adultUserId,
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        });
      } catch (e) {
        console.warn('Proximity response send failed:', e.message ?? e);
      }
    });

    channel.subscribe();
    return channel;
  });

  return () => {
    for (const channel of channels) {
      supabase.removeChannel(channel);
    }
  };
}
