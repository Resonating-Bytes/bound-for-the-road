export const MAX_LEGAL_NAME_LENGTH = 128;
export const MAX_DISPLAY_NAME_LENGTH = 64;
export const MAX_NICKNAME_LENGTH = 64;

export function trimName(value) {
  return String(value ?? '').trim();
}

export function firstTokenFromLegalName(legalName) {
  const trimmed = trimName(legalName);
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

export function hasLegalName(user) {
  return Boolean(trimName(user?.legalName));
}

export function hasDisplayName(user) {
  return Boolean(trimName(user?.displayName));
}

/** Casual label: nickname override, else linked user's display name. */
export function casualLabel({ nickname, displayName, fallback = 'Linked account' }) {
  const nick = trimName(nickname);
  if (nick) return nick;
  const display = trimName(displayName);
  return display || fallback;
}

export function clampName(value, maxLength) {
  return trimName(value).slice(0, maxLength);
}

/** Cap length while typing; preserves spaces (trim on submit with clampName). */
export function limitNameLength(value, maxLength) {
  return String(value ?? '').slice(0, maxLength);
}
