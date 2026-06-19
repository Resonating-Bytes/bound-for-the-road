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

const SUBMIT_PAYLOAD_KEYS = [
  'schemaVersion',
  'sessionId',
  'stateCode',
  'startedAt',
  'endedAt',
  'endedBy',
  'activeSupervisorId',
  'activeSupervisorJoinedAt',
  'durationMinutes',
  'dayNight',
  'notes',
  'submittedAt',
  'submittedByUserId',
];

function stableStringifyWithKeys(obj, keys) {
  const sorted = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sorted[key] = obj[key];
    }
  }
  return JSON.stringify(sorted);
}

export function stableStringify(obj) {
  return stableStringifyWithKeys(obj, MVP_PAYLOAD_KEYS);
}

export function stableSubmitStringify(obj) {
  return stableStringifyWithKeys(obj, SUBMIT_PAYLOAD_KEYS);
}

export function payloadKeyOrder(payload) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'submittedAt')) {
    return SUBMIT_PAYLOAD_KEYS;
  }
  return MVP_PAYLOAD_KEYS;
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

export function buildSubmitPayload({
  sessionId,
  stateCode,
  startedAt,
  endedAt,
  endedBy = 'teen',
  activeSupervisorId = null,
  activeSupervisorJoinedAt = null,
  durationMinutes,
  dayNight,
  notes,
  submittedByUserId,
}) {
  return {
    schemaVersion: 1,
    sessionId,
    stateCode,
    startedAt,
    endedAt,
    endedBy,
    activeSupervisorId,
    activeSupervisorJoinedAt,
    durationMinutes,
    dayNight,
    notes: notes ?? null,
    submittedAt: nowISO(),
    submittedByUserId,
  };
}

export async function computeRequestHash(payload) {
  const keys = payloadKeyOrder(payload);
  const canonical = stableStringifyWithKeys(payload, keys);
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
