import { providers } from '@/providers/registry';
import { searchCatalogNearby, searchPhotonNearby } from '@/services/places/photon-nearby.service';
import { rememberPlaces } from '@/services/places/place-cache';
import type { GeoPoint, Place, PlaceCategory } from '@/types/domain';
import type { CompanionPrefs } from '@/utils/companion-suitability';
import { applyCompanionFilter, companionFilterActive } from '@/utils/companion-suitability';
import { filterPlacesWithinRadius } from '@/utils/geo';
import { env } from '@/config/env';
import {
  filterPlacesByCategory,
  isSightseeingCategory,
  isFoodCategory,
  isShoppingCategory,
} from '@/utils/place-category-match';
import { sortPlacesByCategoryPopularity } from '@/utils/place-popularity';

const LIVE_BUDGET_MS = 7_000;
const MAX_RADIUS_METERS = 200_000;

function delay(ms: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
}

async function raceWithBudget<T>(promise: Promise<T>, budgetMs: number): Promise<T | null> {
  return Promise.race([promise, delay(budgetMs)]);
}

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.name.toLowerCase().trim()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scrubNoiseTags(place: Place): Place {
  if (!place.tags?.length) return place;
  const tags = place.tags.filter(
    (tag) => !/^(house|yes|no|building|residential|apartments|commercial)$/i.test(tag.trim()),
  );
  return tags.length === place.tags.length ? place : { ...place, tags };
}

/** Famous-city tokens that must not appear when the traveler is elsewhere. */
const FOREIGN_LANDMARK_HINT =
  /\b(shibuya|dogenzaka|shinjuku|harajuku|asakusa|akihabara|ginza|meiji jingu|tokyo tower|shibuya sky|ichiran shibuya)\b/i;

/**
 * Drop curated/demo rows that still carry another city's landmark names when
 * the active city label is not that city (extra safety beyond haversine).
 */
function dropForeignLandmarkNoise(
  places: Place[],
  cityLabel?: string | null,
): Place[] {
  const label = (cityLabel ?? '').toLowerCase();
  const inTokyoContext = /tokyo|shibuya|shinjuku|harajuku|japan/.test(label);
  if (inTokyoContext) return places;

  return places.filter((place) => {
    const haystack = `${place.name} ${place.address ?? ''}`;
    return !FOREIGN_LANDMARK_HINT.test(haystack);
  });
}

function shouldBlendCatalog(category?: PlaceCategory): boolean {
  return (
    !category ||
    isSightseeingCategory(category) ||
    isFoodCategory(category) ||
    isShoppingCategory(category) ||
    category === 'hotel'
  );
}

/**
 * Explore nearby: merge live OSM + Photon + curated landmarks, then rank by
 * popularity within the selected category (not only distance).
 * Coordinates are always re-checked against the selected radius.
 */
export async function getExploreNearbyPlaces(params: {
  location: GeoPoint;
  category?: PlaceCategory;
  cityLabel?: string | null;
  radiusMeters: number;
  limit?: number;
  companions?: CompanionPrefs | null;
}): Promise<Place[]> {
  const limit = Math.min(Math.max(params.limit ?? 80, 20), 120);
  const radius = Math.min(Math.max(params.radiusMeters, 500), MAX_RADIUS_METERS);

  const photonPromise = searchPhotonNearby({
    location: params.location,
    category: params.category,
    cityLabel: params.cityLabel,
    radiusMeters: radius,
    limit: Math.max(limit, 40),
  }).catch(() => [] as Place[]);

  const livePromise = providers.places
    .getNearbyPlaces({
      location: params.location,
      radiusMeters: radius,
      category: params.category,
      limit: Math.max(limit, 60),
    })
    .catch(() => [] as Place[]);

  const [live, photon] = await Promise.all([
    raceWithBudget(livePromise, LIVE_BUDGET_MS).then((v) => v ?? []),
    photonPromise,
  ]);

  const lateLive = live.length ? live : await livePromise;

  const catalog = shouldBlendCatalog(params.category)
    ? searchCatalogNearby({
        location: params.location,
        category: params.category ?? 'attraction',
        radiusMeters: radius,
        limit: Math.max(40, Math.floor(limit / 2)),
      })
    : [];

  let merged = dedupe([...catalog, ...lateLive, ...photon]).map(scrubNoiseTags);
  // Never leak Tokyo/demo POIs into live mode.
  if (!env.useMockProviders) {
    merged = merged.filter((place) => place.provider !== 'mock');
  }
  merged = filterPlacesWithinRadius(merged, params.location, radius);
  // Drop anything whose name/address clearly belongs to another famous city far away.
  merged = dropForeignLandmarkNoise(merged, params.cityLabel);
  merged = filterPlacesByCategory(merged, params.category);

  const ranked = sortPlacesByCategoryPopularity(merged, params.category);

  const tailored = companionFilterActive(params.companions)
    ? applyCompanionFilter(ranked, params.companions)
    : ranked;

  const result = tailored.slice(0, limit);
  rememberPlaces(result);
  return result;
}
