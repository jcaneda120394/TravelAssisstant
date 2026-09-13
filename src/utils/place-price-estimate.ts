import type { Place, PlaceCategory } from '@/types/domain';
import { formatMoneyAmount, usdToCurrency } from '@/utils/display-money';

export type PlacePriceUnit = 'night' | 'meal' | 'ticket' | 'visit' | 'spend' | 'pass' | 'free' | 'unknown';

export type PlacePriceEstimate = {
  min: number;
  max: number;
  currency: string;
  unit: PlacePriceUnit;
  /** Ready-to-show line, e.g. "Est. PHP 4,500–9,000 / night" or "Free entry" */
  label: string;
  /** true when amount is a heuristic band, not a live quoted price */
  isEstimate?: boolean;
};

function roundMoney(amount: number, currency: string): number {
  const c = currency.toUpperCase();
  if (c === 'JPY' || c === 'KRW' || c === 'VND' || c === 'IDR') {
    return Math.round(amount / 50) * 50;
  }
  if (amount >= 1000) return Math.round(amount / 50) * 50;
  if (amount >= 100) return Math.round(amount / 10) * 10;
  return Math.round(amount);
}

function fromUsd(usd: number, currency: string): number {
  return roundMoney(usdToCurrency(usd, currency), currency);
}

function formatAmount(amount: number, currency: string): string {
  return formatMoneyAmount(amount, currency);
}

function unitSuffix(unit: PlacePriceUnit): string {
  switch (unit) {
    case 'night':
      return ' / night';
    case 'meal':
      return ' / meal';
    case 'ticket':
      return ' / ticket';
    case 'pass':
      return ' / day pass';
    case 'visit':
      return ' / visit';
    case 'spend':
    case 'free':
    case 'unknown':
      return '';
    default:
      return '';
  }
}

function haystack(place: Place): string {
  return [place.name, place.category, place.description, place.cuisine, ...(place.tags ?? [])]
    .join(' ')
    .toLowerCase();
}

function freeEstimate(currency: string, label = 'Free entry'): PlacePriceEstimate {
  return {
    min: 0,
    max: 0,
    currency: currency.toUpperCase(),
    unit: 'free',
    label,
    isEstimate: false,
  };
}

function unknownEstimate(currency: string, label = 'Price varies'): PlacePriceEstimate {
  return {
    min: 0,
    max: 0,
    currency: currency.toUpperCase(),
    unit: 'unknown',
    label,
    isEstimate: false,
  };
}

function rangedEstimate(
  bandUsd: [number, number],
  currency: string,
  unit: PlacePriceUnit,
): PlacePriceEstimate {
  const cur = currency.toUpperCase();
  const min = fromUsd(bandUsd[0], cur);
  const max = fromUsd(bandUsd[1], cur);
  return {
    min,
    max,
    currency: cur,
    unit,
    isEstimate: true,
    label: `Est. ${formatAmount(min, cur)}–${formatAmount(max, cur).replace(`${cur} `, '')}${unitSuffix(unit)}`,
  };
}

/** Public outdoor spots that do not sell tickets. */
export function isFreeOutdoorLandmark(place: Place): boolean {
  const text = haystack(place);
  if (
    /\b(crossing|scramble|plaza|square|promenade|boardwalk|waterfront|seaside|pier\b|street|alley|district|neighborhood|neighbourhood|avenue|boulevard|market street|chinatown|little italy|old town|historic center|historic centre)\b/i.test(
      text,
    )
  ) {
    // Paid observation decks / towers that share a district name (e.g. Shibuya Sky)
    if (isPaidAdmissionAttraction(place)) return false;
    return true;
  }
  if (
    /\b(times square|shibuya crossing|dotonbori|takeshita|yanaka ginza|harajuku|akihabara|shinsekai|gion district|philosopher.?s path|bamboo grove|arashiyama bamboo|imperial palace east|peace memorial park|lake kawaguchi|chureito)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

export function isThemePark(place: Place): boolean {
  return /disney|universal studios|theme park|amusement park|ocean park|legoland|everland|lotte world/i.test(
    haystack(place),
  );
}

/** Museums, towers, zoos, castles, etc. that typically charge admission. */
export function isPaidAdmissionAttraction(place: Place): boolean {
  const text = haystack(place);
  const category = place.category;
  if (isThemePark(place)) return true;
  if (category === 'museum' || category === 'zoo') return true;
  if (
    /\b(museum|aquarium|zoo|gallery|teamlab|ghibli|observation|skytree|shibuya sky|tokyo tower|eiffel|empire state|burj|skydeck|observatory|castle|palace|gyeongbok|forbidden city|louvre|vatican|universal|disneyland|disneysea)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/\btower\b/i.test(text) && !/\b(water tower|clock tower plaza)\b/i.test(text)) {
    return true;
  }
  return false;
}

function hotelBandUsd(place: Place, budgetTier?: string | null): [number, number] {
  const text = haystack(place);
  if (/disney|ritz|four seasons|mandarin oriental|peninsula|st\.?\s*regis|aman\b/i.test(text)) {
    return [280, 650];
  }
  if (/hyatt|marriott|hilton|sheraton|intercontinental|westin|conrad/i.test(text)) {
    return [140, 320];
  }
  if (/ibis|hostel|capsule|guest house|guesthouse|inn\b/i.test(text)) {
    return [35, 90];
  }
  switch (budgetTier) {
    case 'backpacker':
    case 'budget':
      return [40, 100];
    case 'premium':
      return [150, 320];
    case 'luxury':
      return [250, 550];
    default:
      return [70, 180];
  }
}

function restaurantBandUsd(place: Place): [number, number] {
  const text = haystack(place);
  if (/michelin|fine dining|omakase|kaiseki/i.test(text)) return [60, 180];
  if (place.category === 'cafe') return [4, 14];
  if (place.category === 'nightlife') return [12, 45];
  if (/ramen|noodle|street food|fast food|yakitori|izakaya/i.test(text)) return [6, 18];
  return [10, 35];
}

function paidAttractionBandUsd(place: Place): [number, number] {
  if (isThemePark(place)) return [55, 95];
  const text = haystack(place);
  if (/skytree|shibuya sky|observation|tokyo tower|eiffel|burj|empire state/i.test(text)) {
    return [12, 35];
  }
  if (/teamlab|ghibli|aquarium/i.test(text)) return [15, 40];
  if (place.category === 'zoo') return [8, 25];
  if (place.category === 'museum') return [8, 30];
  if (/castle|palace/i.test(text)) return [3, 15];
  return [8, 25];
}

/**
 * Estimated spend for a place in the traveler's display currency.
 * Prefer live OSM fee/charge (`priceRange`) when present.
 * Never invent ticket prices for free outdoor landmarks (e.g. Shibuya Crossing).
 */
export function estimatePlacePrice(
  place: Place,
  currency: string,
  budgetTier?: string | null,
): PlacePriceEstimate | null {
  const cur = (currency || 'USD').toUpperCase();
  const category: PlaceCategory = place.category;

  // Prefer structured / OSM-sourced price when present.
  if (place.priceRange?.trim()) {
    const raw = place.priceRange.trim();
    const free = /^free\b/i.test(raw) || /free entry/i.test(raw);
    return {
      min: 0,
      max: 0,
      currency: cur,
      unit: free ? 'free' : 'spend',
      label: raw,
      isEstimate: false,
    };
  }

  if (category === 'hotel') {
    return rangedEstimate(hotelBandUsd(place, budgetTier), cur, 'night');
  }
  if (category === 'restaurant' || category === 'cafe' || category === 'bakery' || category === 'nightlife') {
    return rangedEstimate(restaurantBandUsd(place), cur, 'meal');
  }

  if (isFreeOutdoorLandmark(place)) {
    return freeEstimate(cur, 'Free · public outdoor spot');
  }

  if (
    category === 'attraction' ||
    category === 'museum' ||
    category === 'zoo' ||
    category === 'viewpoint'
  ) {
    if (isPaidAdmissionAttraction(place)) {
      return rangedEstimate(paidAttractionBandUsd(place), cur, 'ticket');
    }
    // Unknown attraction — do not invent a ticket fee.
    return unknownEstimate(cur, 'No ticket listed');
  }

  if (category === 'park' || category === 'beach' || category === 'temple') {
    if (/national park|disney|universal|garden admission|shinjuku gyoen|korakuen/i.test(haystack(place))) {
      return rangedEstimate([3, 15], cur, 'ticket');
    }
    return freeEstimate(cur, 'Often free / small donation');
  }

  if (category === 'spa') {
    return rangedEstimate([25, 90], cur, 'visit');
  }
  if (category === 'gym') {
    return rangedEstimate([8, 25], cur, 'pass');
  }
  if (category === 'shopping' || category === 'mall' || category === 'market') {
    return {
      min: 0,
      max: 0,
      currency: cur,
      unit: 'spend',
      isEstimate: true,
      label: 'Entry free · shopping spend varies',
    };
  }

  return null;
}

/** Star rating text when the place has a real rating. */
export function formatPlaceRating(place: Place): string | null {
  if (place.rating == null || place.rating <= 0) return null;
  const stars = Math.round(place.rating * 10) / 10;
  const reviews =
    place.reviewCount != null && place.reviewCount > 0
      ? ` (${place.reviewCount.toLocaleString()})`
      : '';
  return `${stars}★${reviews}`;
}

/**
 * Pull OSM hotel stars / fees into Place fields when tags exist.
 */
export function applyOsmPriceAndStars(
  place: Place,
  tags?: Record<string, string> | null,
): Place {
  if (!tags) return place;
  let next = place;

  const starsRaw = tags.stars ?? tags['stars:hotel'];
  if (starsRaw && place.rating == null) {
    const stars = Number(starsRaw);
    if (Number.isFinite(stars) && stars > 0 && stars <= 5) {
      next = { ...next, rating: stars };
    }
  }

  if (place.priceRange) {
    return next;
  }

  const fee = (tags.fee ?? tags.charge ?? '').trim();
  const charge =
    tags.charge ??
    tags['charge:adult'] ??
    tags['fee:amount'] ??
    tags['fee:price'] ??
    tags.payment;

  if (/^no$/i.test(fee) || /^donation$/i.test(fee)) {
    next = {
      ...next,
      priceRange: /^donation$/i.test(fee) ? 'Free / donation welcome' : 'Free entry',
    };
    return next;
  }

  if (charge && !/^yes$/i.test(charge) && charge.length > 0) {
    next = { ...next, priceRange: `Listed fee: ${charge}` };
    return next;
  }

  if (/^yes$/i.test(fee)) {
    next = { ...next, priceRange: 'Paid entry' };
    return next;
  }

  return next;
}
