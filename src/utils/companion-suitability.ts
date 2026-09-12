import type { Place, PlaceCategory } from '@/types/domain';

export type CompanionPrefs = {
  traveling_with_kids?: boolean;
  kids_ages?: number[];
  traveling_with_elderly?: boolean;
  elderly_ages?: number[];
};

/** Parse "5, 8, 12" or "5 8" into ages. */
export function parseAgeList(raw: string, opts?: { min?: number; max?: number }): number[] {
  const min = opts?.min ?? 0;
  const max = opts?.max ?? 120;
  const seen = new Set<number>();
  const ages: number[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const value = Number(trimmed);
    if (!Number.isFinite(value)) continue;
    const age = Math.round(value);
    if (age < min || age > max || seen.has(age)) continue;
    seen.add(age);
    ages.push(age);
  }
  return ages.sort((a, b) => a - b);
}

export function formatAgeList(ages: number[] | undefined | null): string {
  if (!ages?.length) return '';
  return ages.join(', ');
}

function haystack(place: Place): string {
  return [
    place.name,
    place.category,
    place.description,
    place.cuisine,
    ...(place.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function kidsScore(place: Place, ages: number[]): number {
  const text = haystack(place);
  const youngest = ages.length ? Math.min(...ages) : 8;
  const oldest = ages.length ? Math.max(...ages) : 12;
  let score = 0;

  // Strong kid-friendly signals
  if (
    /playground|zoo|aquarium|theme park|amusement|kids|children|family|soft play|carousel|disney|legoland|science center|planetarium|beach|park|mall|ice cream|pizza|burger|jollibee|mcdonald/i.test(
      text,
    )
  ) {
    score += 8;
  }
  if (['park', 'zoo', 'mall', 'beach', 'cafe', 'market'].includes(place.category)) {
    score += 4;
  }
  if (place.category === 'attraction' || place.category === 'museum') {
    score += youngest >= 6 ? 3 : 1;
  }
  if (place.category === 'restaurant') {
    score += 2;
  }

  // Age-specific
  if (youngest <= 5) {
    if (/nightlife|bar|pub|club|izakaya|sake|wine bar|casino|hike|trail|viewpoint|gym|spa/i.test(text)) {
      score -= 12;
    }
    if (place.category === 'nightlife' || place.category === 'spa' || place.category === 'gym') {
      score -= 14;
    }
  }
  if (oldest >= 13) {
    if (/shopping|mall|arcade|bowling|cafe|market/i.test(text)) {
      score += 2;
    }
  }

  // Adult-only / unsuitable
  if (/strip club|adult only|18\+|21\+/i.test(text)) {
    score -= 20;
  }
  if (place.category === 'nightlife') {
    score -= youngest < 16 ? 10 : 2;
  }

  return score;
}

function elderlyScore(place: Place, ages: number[]): number {
  const text = haystack(place);
  const oldest = ages.length ? Math.max(...ages) : 70;
  let score = 0;

  if (
    /park|garden|temple|shrine|church|cathedral|museum|cafe|coffee|mall|plaza|palace|market|scenic|easy|accessible|wheelchair/i.test(
      text,
    )
  ) {
    score += 7;
  }
  const gentle: PlaceCategory[] = ['park', 'temple', 'museum', 'cafe', 'mall', 'market', 'restaurant'];
  if (gentle.includes(place.category)) {
    score += 4;
  }

  if (/hike|hiking|trail|climb|steep|stairs|gym|nightlife|club|bar crawl|theme park|roller|extreme|adventure/i.test(text)) {
    score -= 10;
  }
  if (['nightlife', 'gym', 'viewpoint', 'zoo'].includes(place.category) && oldest >= 75) {
    score -= place.category === 'nightlife' || place.category === 'gym' ? 12 : 3;
  }
  if (place.category === 'spa') {
    score += 3;
  }

  return score;
}

function isHardReject(place: Place, prefs: CompanionPrefs): boolean {
  const text = haystack(place);
  const kids = prefs.traveling_with_kids ? prefs.kids_ages ?? [] : [];
  const youngest = kids.length ? Math.min(...kids) : null;

  if (prefs.traveling_with_kids && youngest != null && youngest < 13) {
    if (place.category === 'nightlife') return true;
    if (/strip club|adult only|nightclub|18\+|21\+/i.test(text)) return true;
  }
  if (prefs.traveling_with_elderly) {
    if (place.category === 'nightlife' && /club|bar crawl/i.test(text)) return true;
  }
  return false;
}

/**
 * Filter + rank places for kids/elderly ages.
 * Soft-ranks when possible; hard-drops clearly unsuitable spots.
 * Never returns empty if the input had places — falls back to soft ranking.
 */
export function applyCompanionFilter(
  places: Place[],
  prefs: CompanionPrefs | null | undefined,
): Place[] {
  if (!places.length) return places;
  if (!prefs?.traveling_with_kids && !prefs?.traveling_with_elderly) {
    return places;
  }

  const kidsAges = prefs.traveling_with_kids ? prefs.kids_ages ?? [] : [];
  const elderlyAges = prefs.traveling_with_elderly ? prefs.elderly_ages ?? [] : [];

  const scored = places.map((place) => {
    let score = 0;
    if (prefs.traveling_with_kids) {
      score += kidsScore(place, kidsAges);
    }
    if (prefs.traveling_with_elderly) {
      score += elderlyScore(place, elderlyAges);
    }
    return { place, score, reject: isHardReject(place, prefs) };
  });

  const kept = scored.filter((item) => !item.reject);
  const pool = kept.length > 0 ? kept : scored;
  return pool
    .sort((a, b) => b.score - a.score)
    .map((item) => item.place);
}

export function companionFilterActive(prefs: CompanionPrefs | null | undefined): boolean {
  return Boolean(prefs?.traveling_with_kids || prefs?.traveling_with_elderly);
}
