/**
 * Build display names that keep the local/original language and add
 * an English translation in parentheses when available.
 * Example: "東京駅 (Tokyo Station)"
 */

const LOCAL_NAME_KEYS = [
  'name:ja',
  'name:zh',
  'name:zh-Hans',
  'name:zh-Hant',
  'name:ko',
  'name:th',
  'name:tl',
  'name:fil',
  'name:id',
  'name:ms',
  'name:vi',
  'name:hi',
  'name:ar',
  'name:ru',
] as const;

/** True when the string includes non-Latin letters (CJK, Hangul, Thai, Arabic, etc.). */
export function hasNonLatinScript(value: string): boolean {
  return /[^\u0000-\u024F\u1E00-\u1EFF\s0-9'’\-.,&()/]/.test(value);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function pickFromMap(
  map: Record<string, string> | undefined,
  keys: readonly string[],
): string | undefined {
  if (!map) {
    return undefined;
  }
  for (const key of keys) {
    const value = map[key]?.trim();
    if (value && value.length >= 2) {
      return value;
    }
  }
  return undefined;
}

export function formatBilingualPlaceName(original: string, english?: string | null): string {
  const local = original.trim();
  const en = english?.trim();
  if (!local) {
    return en || '';
  }
  if (!en || normalizeName(local) === normalizeName(en)) {
    return local;
  }
  // Already formatted.
  if (local.includes(`(${en})`) || local.endsWith(`(${en})`)) {
    return local;
  }
  return `${local} (${en})`;
}

/**
 * Resolve original + English from OSM/Nominatim name maps and format display name.
 */
export function resolveBilingualPlaceName(input: {
  primary?: string | null;
  displayName?: string | null;
  names?: Record<string, string> | null;
  tags?: Record<string, string> | null;
}): string | null {
  const map: Record<string, string> = {
    ...(input.tags ?? {}),
    ...(input.names ?? {}),
  };

  const primary = (input.primary ?? map.name ?? '').trim();
  const english =
    pickFromMap(map, ['name:en', 'name:en-US', 'name:en-GB']) ||
    (!hasNonLatinScript(primary) && primary ? primary : undefined);

  const localFromTags = pickFromMap(map, LOCAL_NAME_KEYS);

  let original = primary;
  if (localFromTags && hasNonLatinScript(localFromTags)) {
    original = localFromTags;
  } else if (primary && hasNonLatinScript(primary)) {
    original = primary;
  } else if (localFromTags) {
    original = localFromTags;
  }

  // English: prefer name:en; if original is local script and primary is Latin, use primary.
  let en =
    pickFromMap(map, ['name:en', 'name:en-US', 'name:en-GB']) ||
    (hasNonLatinScript(original) && primary && !hasNonLatinScript(primary) ? primary : undefined);

  if (!original || original.length < 2) {
    const fromDisplay = (input.displayName ?? '')
      .split(',')
      .map((part) => part.trim())
      .find((part) => part.length >= 2 && !/^\d+$/.test(part));
    original = fromDisplay ?? '';
  }

  if (!original) {
    return en && en.length >= 2 ? en : null;
  }

  // If we only have Latin primary and English is same, fine.
  if (!en && english && normalizeName(english) !== normalizeName(original)) {
    en = english;
  }

  return formatBilingualPlaceName(original, en);
}

export function displayPlaceName(place: {
  name: string;
  nameOriginal?: string;
  nameEnglish?: string;
}): string {
  if (place.nameOriginal && place.nameEnglish) {
    return formatBilingualPlaceName(place.nameOriginal, place.nameEnglish);
  }
  // name may already be "Local (English)"
  return place.name;
}

const DAY_MAP: Record<string, string> = {
  Mo: 'Mon',
  Tu: 'Tue',
  We: 'Wed',
  Th: 'Thu',
  Fr: 'Fri',
  Sa: 'Sat',
  Su: 'Sun',
  PH: 'Public holiday',
};

/** Keep original OSM/local hours and add a readable English version in parentheses. */
export function displayOpeningHours(raw?: string[] | string | null): string {
  const original = (Array.isArray(raw) ? raw.filter(Boolean).join('; ') : raw ?? '').trim();
  if (!original) {
    return 'Hours not listed';
  }

  let english = original;
  for (const [code, label] of Object.entries(DAY_MAP)) {
    english = english.replace(new RegExp(`\\b${code}\\b`, 'g'), label);
  }
  english = english
    .replace(/\boff\b/gi, 'closed')
    .replace(/24\/7/g, 'open 24 hours')
    .replace(/;/g, '; ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalizeName(english) === normalizeName(original)) {
    return original;
  }
  return `${original} (${english})`;
}
