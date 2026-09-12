import type { Place, PlaceCategory } from '@/types/domain';

/**
 * Soft related categories (e.g. Shopping includes mall/market).
 * Utility categories like airport stay strict — never attractions.
 */
export const CATEGORY_MATCH: Record<PlaceCategory, PlaceCategory[]> = {
  restaurant: ['restaurant', 'cafe', 'bakery'],
  cafe: ['cafe', 'bakery', 'restaurant'],
  bakery: ['bakery', 'cafe'],
  attraction: ['attraction', 'park', 'museum', 'temple', 'viewpoint', 'zoo', 'beach'],
  shopping: ['shopping', 'mall', 'market', 'souvenir', 'convenience'],
  mall: ['mall', 'shopping'],
  park: ['park', 'attraction'],
  museum: ['museum', 'attraction'],
  temple: ['temple', 'attraction'],
  market: ['market', 'shopping', 'convenience'],
  viewpoint: ['viewpoint', 'attraction'],
  zoo: ['zoo', 'attraction'],
  nightlife: ['nightlife', 'restaurant'],
  beach: ['beach', 'attraction'],
  spa: ['spa'],
  gym: ['gym'],
  hotel: ['hotel'],
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
  return allowed.includes(place.category);
}

export function filterPlacesByCategory(
  places: Place[],
  category?: PlaceCategory | null,
): Place[] {
  if (!category || category === 'other') return places;
  return places.filter((place) => placeMatchesCategory(place, category));
}
