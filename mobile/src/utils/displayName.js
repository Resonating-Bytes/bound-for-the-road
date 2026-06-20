import { casualLabel } from './names';

/** @deprecated Use casualLabel with displayName. */
export function getFirstName(legalName) {
  const trimmed = String(legalName ?? '').trim();
  if (!trimmed) return 'Driver';
  return trimmed.split(/\s+/)[0];
}

export function shortDisplayNamesForTeens(teens) {
  return (teens ?? []).map((teen) =>
    casualLabel({
      nickname: teen.nickname,
      displayName: teen.displayName ?? teen.name,
      fallback: 'Driver',
    }),
  );
}

export function shortDisplayNameForTeen(teens, teenUserId) {
  const list = teens ?? [];
  const index = list.findIndex((teen) => teen.teenUserId === teenUserId);
  if (index < 0) return 'Driver';
  return shortDisplayNamesForTeens(list)[index];
}
