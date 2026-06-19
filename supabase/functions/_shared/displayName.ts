/** First token of legal name (e.g. "Jane Doe" → "Jane"). */
export function getFirstName(legalName: string | null | undefined): string {
  const trimmed = (legalName ?? '').trim();
  if (!trimmed) return 'Driver';
  return trimmed.split(/\s+/)[0];
}

/** Last name initial for disambiguation (e.g. "Jane Doe" → "D"). */
export function getLastInitial(legalName: string | null | undefined): string {
  const parts = (legalName ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return '';
  const letter = parts[parts.length - 1][0];
  return letter ? letter.toUpperCase() : '';
}

/** Short labels for a group of legal names. */
export function shortDisplayNames(legalNames: (string | null | undefined)[]): string[] {
  const list = (legalNames ?? []).map((name) => String(name ?? ''));
  const firstNames = list.map((name) => getFirstName(name));
  const counts: Record<string, number> = {};
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

export function shortDisplayNameAtIndex(
  legalNames: (string | null | undefined)[],
  index: number,
  fallback = 'Driver',
): string {
  if (index < 0) return fallback;
  return shortDisplayNames(legalNames)[index] ?? fallback;
}
