import type { Place, PlaceCategory } from '@/types/domain';
import { isSightseeingCategory, placeMatchesCategory } from '@/utils/place-category-match';

/**
 * Rank places for Home/Explore lists.
 * Popular / well-known places first within the active category, then rating/reviews, then distance.
 */
export function sortPlacesByPopularity(places: Place[]): Place[] {
  return sortPlacesByCategoryPopularity(places, undefined);
}

export function sortPlacesByCategoryPopularity(
  places: Place[],
  category?: PlaceCategory | null,
): Place[] {
  return [...places].sort(
    (a, b) => popularityScore(b, category) - popularityScore(a, category),
  );
}

/**
 * "Near you" ranking: closest first, with popularity only as a tie-break inside ~1 km bands.
 * Famous far landmarks (e.g. 25 km away) must not outrank places next to the traveler.
 */
export function sortPlacesByNearness(
  places: Place[],
  category?: PlaceCategory | null,
  bandMeters = 1_000,
): Place[] {
  const band = Math.max(200, bandMeters);
  return [...places].sort((a, b) => {
    const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
    const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
    const bandA = Math.floor(da / band);
    const bandB = Math.floor(db / band);
    if (bandA !== bandB) return bandA - bandB;
    const scoreDiff = popularityScore(b, category) - popularityScore(a, category);
    if (scoreDiff !== 0) return scoreDiff;
    return da - db;
  });
}

function haystack(place: Place): string {
  return [place.name, place.category, place.description, place.cuisine, ...(place.tags ?? [])]
    .join(' ')
    .toLowerCase();
}

function categoryMatchBonus(place: Place, category?: PlaceCategory | null): number {
  if (!category || category === 'other') return 0;
  if (place.category === category) return 12;
  if (placeMatchesCategory(place, category)) return 6;
  return -40; // Strongly demote wrong-category leftovers if any slip through
}

function popularityScore(place: Place, category?: PlaceCategory | null): number {
  const rating = place.rating ?? 0;
  const reviews = Math.min(place.reviewCount ?? 0, 120_000);
  const distanceMeters = place.distanceMeters ?? 40_000;
  const text = haystack(place);
  const tags = (place.tags ?? []).join(' ').toLowerCase();

  // Famous-attraction boost only when browsing sightseeing (or no category).
  // Require real aerial/gondola names — bare "Cable Car" matches nightlife bars too.
  const allowLandmarkBoost = isSightseeingCategory(category);
  const majorLandmarkBonus =
    allowLandmarkBoost &&
    (/disneyland|disney|ocean park|ngong ping|peak tram|victoria peak|big buddha|tian tan|po lin|star ferry|times square|eiffel|louvre|colosseum|sagrada|marina bay|gardens by the bay|tokyo skytree|senso-?ji|shibuya crossing|universal studios|theme park|ngong ping 360|peak tram|aerial tramway|gondola|funicular|burj|opera house|central park|hyde park|tower bridge|british museum|machu picchu|great wall|forbidden city|acropolis|christ the redeemer|golden gate|petronas|angkor/i.test(
      text,
    ) ||
      tags.includes('famous') ||
      (place.category === 'attraction' &&
        /\b(aerialway|gondola|cable.?car|funicular)\b/i.test(tags)))
      ? 28
      : 0;

  const underratedBonus = tags.includes('underrated') || tags.includes('hidden gem') ? 5 : 0;
  const localBonus = tags.includes('local') ? 2 : 0;

  const landmarkBonus =
    /mall|park|cathedral|museum|temple|shrine|plaza|market|palace|castle|zoo|aquarium|beach|garden|monument|basilica|tower|harbour|harbor|ferry|viewpoint|observation|landmark|heritage|national|waterfall|village|resort|hotel|station|airport/i.test(
      text,
    )
      ? 4
      : 0;

  const foodBonus =
    category === 'restaurant' || category === 'cafe' || category === 'bakery' || category === 'nightlife' || !category
      ? /restaurant|cafe|coffee|grill|kitchen|bistro|ramen|sushi|pizza|burger|bakery|barbecue|bbq|dim sum|noodle|michelin|street food|hawker/i.test(
          text,
        )
        ? 3
        : 0
      : 0;

  const hotelBonus =
    category === 'hotel' || !category
      ? /hotel|resort|hyatt|marriott|hilton|sheraton|ritz|intercontinental|novotel|ibis|hostel/i.test(text)
        ? 4
        : 0
      : 0;

  const shoppingBonus =
    category === 'shopping' || category === 'mall' || category === 'market' || !category
      ? /mall|market|department|outlet|shopping|ifc|harbour city|sogo|uniqlo/i.test(text)
        ? 3
        : 0
      : 0;

  const noisePenalty =
    /evangelical|baptist|methodist|presbyterian|assembly of god|residential|unnamed/i.test(text) ||
    (place.tags ?? []).some((tag) => /^(house|yes|no|building)$/i.test(tag))
      ? 8
      : 0;

  const catalogBoost = place.provider === 'world-catalog' || place.provider === 'local-catalog' ? 6 : 0;

  // Stronger nearness bias when used as a secondary signal elsewhere.
  const distanceScore = Math.max(0, 12 - distanceMeters / 8_000);

  return (
    majorLandmarkBonus +
    underratedBonus +
    localBonus +
    landmarkBonus +
    foodBonus +
    hotelBonus +
    shoppingBonus +
    categoryMatchBonus(place, category) +
    catalogBoost +
    rating * 3 +
    reviews / 4_000 +
    distanceScore -
    noisePenalty
  );
}

export function topPopularPlaces(places: Place[], limit = 15): Place[] {
  return sortPlacesByPopularity(places).slice(0, limit);
}

/** Closest places first — used by Home / Explore "near you" feeds. */
export function topNearbyPlaces(
  places: Place[],
  limit = 15,
  category?: PlaceCategory | null,
): Place[] {
  return sortPlacesByNearness(places, category).slice(0, limit);
}
