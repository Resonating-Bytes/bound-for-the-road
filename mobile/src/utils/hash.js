import * as Crypto from 'expo-crypto';
import { nowISO } from './time';

const MVP_PAYLOAD_KEYS = [
  'schemaVersion',
  'sessionId',
  'stateCode',
  'startedAt',
  'endedAt',
  'durationMinutes',
  'dayNight',
  'notes',
  'savedAt',
  'savedByUserId',
];

export function stableStringify(obj) {
  const sorted = {};
  for (const key of MVP_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sorted[key] = obj[key];
    }
  }
  return JSON.stringify(sorted);
}

export function buildSavePayload({
  sessionId,
  stateCode,
  startedAt,
  endedAt,
  durationMinutes,
  dayNight,
  notes,
  savedByUserId,
}) {
  return {
    schemaVersion: 1,
    sessionId,
    stateCode,
    startedAt,
    endedAt,
    durationMinutes,
    dayNight,
    notes: notes ?? null,
    savedAt: nowISO(),
    savedByUserId,
  };
}

export async function computeRequestHash(payload) {
  const canonical = stableStringify(payload);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

export function truncateHash(hash, len = 8) {
  if (!hash) return '';
  return hash.slice(0, len);
}

export async function verifyStoredHash(session) {
  if (!session?.payloadJson || !session?.requestHash) return true;
  const payload =
    typeof session.payloadJson === 'string'
      ? JSON.parse(session.payloadJson)
      : session.payloadJson;
  const recomputed = await computeRequestHash(payload);
  return recomputed === session.requestHash;
}
