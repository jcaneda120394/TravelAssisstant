import type { Place, PlaceCategory } from '@/types/domain';

/**
 * Soft related categories (e.g. Shopping includes mall/market).
 * Utility categories like airport stay strict — never attractions.
 */
export const CATEGORY_MATCH: Record<PlaceCategory, PlaceCategory[]> = {
  restaurant: ['restaurant', 'cafe', 'bakery'],
  cafe: ['cafe', 'bakery', 'restaurant'],
  bakery: ['bakery', 'cafe'],
  attraction: [
    'attraction',
    'park',
    'museum',
    'temple',
    'viewpoint',
    'zoo',
    'beach',
    'hot_spring',
    'cold_spring',
    'spring',
    'lake',
    'river',
    'resort',
  ],
  shopping: ['shopping', 'mall', 'market', 'souvenir', 'convenience'],
  mall: ['mall', 'shopping'],
  park: ['park', 'attraction'],
  museum: ['museum', 'attraction'],
  temple: ['temple', 'attraction'],
  market: ['market', 'shopping', 'convenience'],
  viewpoint: ['viewpoint', 'attraction'],
  zoo: ['zoo', 'attraction'],
  nightlife: ['nightlife', 'restaurant'],
  beach: ['beach'],
  hot_spring: ['hot_spring', 'spring', 'spa'],
  cold_spring: ['cold_spring', 'spring'],
  spring: ['spring', 'hot_spring', 'cold_spring'],
  lake: ['lake', 'park'],
  river: ['river'],
  resort: ['resort', 'hotel', 'beach'],
  spa: ['spa', 'hot_spring'],
  gym: ['gym'],
  hotel: ['hotel', 'resort'],
  hospital: ['hospital', 'clinic'],
  clinic: ['clinic', 'hospital'],
  pharmacy: ['pharmacy'],
  police: ['police'],
  fire: ['fire'],
  embassy: ['embassy'],
  atm: ['atm', 'bank'],
  bank: ['bank', 'atm'],
  convenience: ['convenience', 'market', 'bakery'],
  souvenir: ['souvenir', 'shopping'],
  coworking: ['coworking'],
  transit_station: ['transit_station'],
  airport: ['airport'],
  laundry: ['laundry'],
  fuel: ['fuel'],
  parking: ['parking'],
  toilet: ['toilet'],
  tourist_info: ['tourist_info'],
  post_office: ['post_office'],
  bicycle_rental: ['bicycle_rental'],
  other: ['other'],
};

const SIGHTSEEING = new Set<PlaceCategory>([
  'attraction',
  'park',
  'museum',
  'temple',
  'viewpoint',
  'zoo',
  'beach',
  'hot_spring',
  'cold_spring',
  'spring',
  'lake',
  'river',
  'resort',
]);

const FOOD = new Set<PlaceCategory>(['restaurant', 'cafe', 'bakery', 'nightlife']);

const SHOPPING = new Set<PlaceCategory>(['shopping', 'mall', 'market', 'convenience', 'souvenir']);

export function isSightseeingCategory(category?: PlaceCategory | null): boolean {
  return !category || SIGHTSEEING.has(category);
}

export function isFoodCategory(category?: PlaceCategory | null): boolean {
  return Boolean(category && FOOD.has(category));
}

export function isShoppingCategory(category?: PlaceCategory | null): boolean {
  return Boolean(category && SHOPPING.has(category));
}

export function placeMatchesCategory(
  place: Place,
  category?: PlaceCategory | null,
): boolean {
  if (!category || category === 'other') return true;
  const allowed = CATEGORY_MATCH[category] ?? [category];
  if (allowed.includes(place.category)) return true;

  // Soft name/tag matches for sparse coastal towns (e.g. Barcelona, Sorsogon).
  const haystack = `${place.name} ${place.address ?? ''} ${(place.tags ?? []).join(' ')}`.toLowerCase();
  if (category === 'beach') {
    return /\b(beach|baywalk|seaside|seawall|cove|islet|island|coast|paguriran|rompeolas)\b/i.test(
      haystack,
    );
  }
  if (category === 'hot_spring' || category === 'spring') {
    return /\b(hot spring|hotspring|onsen|thermal|spa spring)\b/i.test(haystack);
  }
  if (category === 'cold_spring') {
    return /\b(cold spring|palogtoc|natural spring)\b/i.test(haystack);
  }
  if (category === 'lake') {
    return /\b(lake|lagoon)\b/i.test(haystack);
  }
  if (category === 'river') {
    return /\b(river|falls|waterfall|creek|stream)\b/i.test(haystack);
  }
  if (category === 'resort') {
    return /\b(resort|villa|beach club)\b/i.test(haystack);
  }
  if (category === 'pharmacy') {
    return /\b(pharmacy|drugstore|drug store|mercury drug|watsons|generika|south star)\b/i.test(
      haystack,
    );
  }
  if (category === 'atm' || category === 'bank') {
    return /\b(atm|bank|money changer|forex|fx|bureau)\b/i.test(haystack);
  }
  if (category === 'attraction' || category === 'temple' || category === 'viewpoint') {
    if (category === 'temple' && /\b(church|parish|cathedral|basilica|shrine|ruins)\b/i.test(haystack)) {
      return true;
    }
    if (category === 'viewpoint' && /\b(viewpoint|view deck|sea wall|boulevard|overlook)\b/i.test(haystack)) {
      return true;
    }
  }
  return false;
}

export function filterPlacesByCategory(
  places: Place[],
  category?: PlaceCategory | null,
): Place[] {
  if (!category || category === 'other') return places;
  return places.filter((place) => placeMatchesCategory(place, category));
}
