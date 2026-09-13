import { isBusinessPlaceType } from '@/lib/images/image-query-builder';
import type { TravelImageCandidate } from '@/lib/images/types';

const MIN_WIDTH = 640;
const BAD_EXT = /\.(svg)(\?|$)/i;
const BAD_TITLE =
  /\b(logo|icon|wordmark|flag|coat of arms|diagram|map of|svg|placeholder|sprite)\b/i;

/** Never use war memorials / military monuments as cafe or restaurant photos. */
const IRRELEVANT_FOR_FOOD =
  /\b(memorial|monument|war|veteran|cemetery|grave|traveling wall|vietnam wall|battlefield|soldier|tomb)\b/i;

const GEO_STOP = new Set([
  'the',
  'and',
  'for',
  'near',
  'with',
  'from',
  'vietnam',
  'japan',
  'philippines',
  'thailand',
  'indonesia',
  'malaysia',
  'singapore',
  'china',
  'korea',
  'spain',
  'france',
  'italy',
  'usa',
  'america',
  'city',
  'town',
  'province',
  'district',
  'street',
  'road',
  'ward',
  'travel',
  'landmark',
  'food',
  'dining',
  'interior',
  'exterior',
  'building',
  'shop',
  'speciality',
  'specialty',
  'special',
]);

export function significantPlaceTokens(placeName: string): string[] {
  return placeName
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .filter((t) => t.length >= 3 && !GEO_STOP.has(t));
}

export function isExcluded(
  candidate: TravelImageCandidate,
  excludeUrls?: string[],
  excludeIds?: string[],
): boolean {
  if (excludeIds?.length && excludeIds.includes(candidate.id)) return true;
  if (!excludeUrls?.length) return false;
  const url = candidate.url.split('?')[0]!;
  return excludeUrls.some((blocked) => {
    const b = blocked.split('?')[0]!;
    return b === url || candidate.url.includes(b) || b.includes(url);
  });
}

export function isAcceptableTravelImage(candidate: TravelImageCandidate): boolean {
  if (!candidate.url || !/^https?:\/\//i.test(candidate.url)) return false;
  if (BAD_EXT.test(candidate.url)) return false;
  if (BAD_TITLE.test(candidate.alt) || BAD_TITLE.test(candidate.searchQuery)) return false;
  if (candidate.width != null && candidate.width > 0 && candidate.width < MIN_WIDTH) {
    return false;
  }
  if (candidate.height != null && candidate.width != null && candidate.width > 0) {
    const ratio = candidate.width / candidate.height;
    if (ratio < 0.45 || ratio > 3.2) return false;
  }
  return true;
}

function typeHintTokens(type: string | null | undefined): string[] {
  const t = (type ?? '').toLowerCase();
  if (t === 'cafe') return ['cafe', 'coffee', 'espresso', 'latte', 'cafeteria'];
  if (t === 'restaurant') return ['restaurant', 'dining', 'kitchen', 'meal', 'eatery'];
  if (t === 'bakery') return ['bakery', 'pastry', 'bread', 'cake'];
  if (t === 'hotel' || t === 'resort') return ['hotel', 'resort', 'lobby', 'room'];
  if (t === 'temple') return ['temple', 'shrine', 'pagoda'];
  if (t === 'beach') return ['beach', 'coast', 'shore'];
  return [];
}

/**
 * True when the photo is plausibly about this place (not just the country).
 */
export function isRelevantToPlace(
  candidate: TravelImageCandidate,
  placeName: string,
  placeType?: string | null,
): boolean {
  const hay = `${candidate.alt} ${candidate.searchQuery}`.toLowerCase();
  if (BAD_TITLE.test(hay)) return false;

  if (isBusinessPlaceType(placeType) && IRRELEVANT_FOR_FOOD.test(hay)) {
    return false;
  }

  const tokens = significantPlaceTokens(placeName);
  const strongHits = tokens.filter((t) => hay.includes(t));
  if (strongHits.length >= 1) return true;

  // Atmosphere: allow city cafe/coffee photos when the place name itself is not in the title.
  const typeHints = typeHintTokens(placeType);
  if (typeHints.some((hint) => hay.includes(hint))) {
    // Still reject if title is clearly a different famous landmark.
    if (/\b(memorial|monument|tower|museum|palace|cathedral|bridge)\b/i.test(hay)) {
      if (!typeHints.some((hint) => hay.includes(hint))) return false;
      // "coffee museum" ok; "vietnam memorial" already rejected above.
      if (IRRELEVANT_FOR_FOOD.test(hay)) return false;
    }
    // Only for food/hotel businesses — attractions still need name hits.
    return isBusinessPlaceType(placeType);
  }

  return false;
}

/** Prefer landscape, higher res, place-name hits in alt. */
export function scoreTravelImage(
  candidate: TravelImageCandidate,
  query: string,
  placeName?: string,
): number {
  let score = 0.2;
  const hay = `${candidate.alt} ${candidate.searchQuery}`.toLowerCase();
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 3 && !GEO_STOP.has(t));
  const queryHits = queryTokens.filter((t) => hay.includes(t)).length;
  if (queryTokens.length) score += Math.min(0.35, (queryHits / queryTokens.length) * 0.35);

  if (placeName) {
    const placeHits = significantPlaceTokens(placeName).filter((t) => hay.includes(t));
    score += Math.min(0.35, placeHits.length * 0.18);
  }

  if (candidate.width && candidate.height) {
    const ratio = candidate.width / candidate.height;
    if (ratio >= 1.2 && ratio <= 2.2) score += 0.1;
    if (candidate.width >= 1200) score += 0.08;
    else if (candidate.width >= 800) score += 0.04;
  }

  if (candidate.provider === 'pexels') score += 0.04;
  if (candidate.provider === 'unsplash') score += 0.03;

  return Math.min(1, score);
}

export function pickBestCandidate(
  candidates: TravelImageCandidate[],
  query: string,
  excludeUrls?: string[],
  excludeIds?: string[],
  placeName?: string,
  placeType?: string | null,
): TravelImageCandidate | null {
  const ranked = candidates
    .filter((c) => !isExcluded(c, excludeUrls, excludeIds))
    .filter(isAcceptableTravelImage)
    .filter((c) => (placeName ? isRelevantToPlace(c, placeName, placeType) : true))
    .map((c) => ({
      ...c,
      score: scoreTravelImage(c, query, placeName),
    }))
    .filter((c) => (c.score ?? 0) >= 0.42)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return ranked[0] ?? null;
}
