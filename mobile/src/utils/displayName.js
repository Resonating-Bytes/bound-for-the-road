/** First token of legal name (e.g. "Jane Doe" → "Jane"). */
export function getFirstName(legalName) {
  const trimmed = String(legalName ?? '').trim();
  if (!trimmed) return 'Driver';
  return trimmed.split(/\s+/)[0];
}

/** Last name initial for disambiguation (e.g. "Jane Doe" → "D"). */
export function getLastInitial(legalName) {
  const parts = String(legalName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return '';
  const letter = parts[parts.length - 1][0];
  return letter ? letter.toUpperCase() : '';
}

/**
 * Short labels for a group of legal names.
 * First name when unique; first + last initial when duplicated.
 */
export function shortDisplayNames(legalNames) {
  const list = (legalNames ?? []).map((name) => String(name ?? ''));
  const firstNames = list.map((name) => getFirstName(name));
  const counts = {};
  for (const first of firstNames) {
    counts[first] = (counts[first] ?? 0) + 1;
  }

  return list.map((name, index) => {
    const first = firstNames[index];
    if (counts[first] <= 1) {
      return first;
    }
    const initial = getLastInitial(name);
    return initial ? `${first} ${initial}.` : first;
  });
}

/**
 * Short labels for teen switcher chips.
 * First name when unique among the group; first + last initial when duplicated.
 */
export function shortDisplayNamesForTeens(teens) {
  return shortDisplayNames((teens ?? []).map((teen) => teen.name));
}

/** Short label for one teen among a linked group (e.g. dashboard empty state). */
export function shortDisplayNameForTeen(teens, teenUserId) {
  const list = teens ?? [];
  const index = list.findIndex((teen) => teen.teenUserId === teenUserId);
  if (index < 0) return 'Driver';
  return shortDisplayNamesForTeens(list)[index];
}
