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
import { dropForeignLandmarkNoise } from '@/utils/place-foreign-noise';
import { sortPlacesByNearness } from '@/utils/place-popularity';
import { dedupePlaces } from '@/utils/dedupe-places';

const LIVE_BUDGET_MS = 7_000;
const MAX_RADIUS_METERS = 200_000;
/** Prefer at least this many hits before stopping radius expansion. */
const MIN_SATISFYING = 12;

function delay(ms: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
}

async function raceWithBudget<T>(promise: Promise<T>, budgetMs: number): Promise<T | null> {
  return Promise.race([promise, delay(budgetMs)]);
}

function scrubNoiseTags(place: Place): Place {
  if (!place.tags?.length) return place;
  const tags = place.tags.filter(
    (tag) => !/^(house|yes|no|building|residential|apartments|commercial)$/i.test(tag.trim()),
  );
  return tags.length === place.tags.length ? place : { ...place, tags };
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

function rankNearby(
  places: Place[],
  origin: GeoPoint,
  radiusMeters: number,
  category: PlaceCategory | undefined,
  cityLabel: string | null | undefined,
  companions: CompanionPrefs | null | undefined,
  limit: number,
): Place[] {
  let merged = dedupePlaces(places).map(scrubNoiseTags);
  if (!env.useMockProviders) {
    merged = merged.filter((place) => place.provider !== 'mock');
  }
  merged = filterPlacesWithinRadius(merged, origin, radiusMeters);
  merged = dropForeignLandmarkNoise(merged, cityLabel);
  merged = filterPlacesByCategory(merged, category);

  const ranked = sortPlacesByNearness(merged, category);
  const tailored = companionFilterActive(companions)
    ? applyCompanionFilter(ranked, companions)
    : ranked;
  return tailored.slice(0, limit);
}

async function fetchExplorePool(params: {
  location: GeoPoint;
  category?: PlaceCategory;
  cityLabel?: string | null;
  radiusMeters: number;
  limit: number;
}): Promise<Place[]> {
  const { location, category, cityLabel, radiusMeters, limit } = params;

  const photonPromise = searchPhotonNearby({
    location,
    category,
    cityLabel,
    radiusMeters,
    limit: Math.max(limit, 40),
  }).catch(() => [] as Place[]);

  const livePromise = providers.places
    .getNearbyPlaces({
      location,
      radiusMeters,
      category,
      limit: Math.max(limit, 60),
      cityLabel,
    })
    .catch(() => [] as Place[]);

  const [live, photon] = await Promise.all([
    raceWithBudget(livePromise, LIVE_BUDGET_MS).then((v) => v ?? []),
    raceWithBudget(photonPromise, LIVE_BUDGET_MS).then((v) => v ?? []),
  ]);

  // Catalog soft radius — keep it near the selected distance so wrong metros
  // (e.g. Manila while in Bulacan) are not force-injected at 60 km.
  const catalog = shouldBlendCatalog(category)
    ? searchCatalogNearby({
        location,
        category: category ?? 'attraction',
        radiusMeters: Math.min(Math.max(radiusMeters, 12_000), 40_000),
        limit: Math.max(48, Math.floor(limit / 2)),
      })
    : [];

  return [...catalog, ...live, ...photon];
}

/**
 * Explore nearby: merge live OSM + Photon + curated landmarks, then rank by
 * popularity within the selected category (not only distance).
 * Sparse towns auto-expand distance until enough local hits appear.
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
  const requested = Math.min(Math.max(params.radiusMeters, 500), MAX_RADIUS_METERS);
  const radii = Array.from(
    new Set([
      requested,
      Math.min(MAX_RADIUS_METERS, Math.max(requested, 50_000)),
      Math.min(MAX_RADIUS_METERS, Math.max(requested, 90_000)),
      Math.min(MAX_RADIUS_METERS, Math.max(requested, 150_000)),
    ]),
  ).sort((a, b) => a - b);

  let best: Place[] = [];
  for (const radius of radii) {
    const pool = await fetchExplorePool({
      location: params.location,
      category: params.category,
      cityLabel: params.cityLabel,
      radiusMeters: radius,
      limit,
    });
    const ranked = rankNearby(
      pool,
      params.location,
      radius,
      params.category,
      params.cityLabel,
      params.companions,
      limit,
    );
    if (ranked.length >= Math.min(MIN_SATISFYING, limit)) {
      rememberPlaces(ranked);
      return ranked;
    }
    if (ranked.length > best.length) {
      best = ranked;
    }
  }

  rememberPlaces(best);
  return best;
}
