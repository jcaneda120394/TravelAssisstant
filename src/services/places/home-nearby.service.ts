import { env } from '@/config/env';
import { providers } from '@/providers/registry';
import { searchCatalogNearby, searchPhotonNearby } from '@/services/places/photon-nearby.service';
import { rememberPlaces } from '@/services/places/place-cache';
import type { GeoPoint, Place } from '@/types/domain';
import type { CompanionPrefs } from '@/utils/companion-suitability';
import { applyCompanionFilter, companionFilterActive } from '@/utils/companion-suitability';
import { filterPlacesWithinRadius } from '@/utils/geo';
import { dropForeignLandmarkNoise } from '@/utils/place-foreign-noise';
import { topPopularPlaces } from '@/utils/place-popularity';

const DEFAULT_LIMIT = 15;
const LIVE_BUDGET_MS = 5_000;

function delay(ms: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
}

async function raceWithBudget<T>(promise: Promise<T>, budgetMs: number): Promise<T | null> {
  return Promise.race([promise, delay(budgetMs)]);
}

function finish(
  places: Place[],
  origin: GeoPoint,
  radiusMeters: number,
  limit: number,
  companions?: CompanionPrefs | null,
  cityLabel?: string | null,
): Place[] {
  const withoutMocks = env.useMockProviders
    ? places
    : places.filter((place) => place.provider !== 'mock');
  const localOnly = dropForeignLandmarkNoise(
    filterPlacesWithinRadius(withoutMocks, origin, radiusMeters),
    cityLabel,
  );
  const seen = new Set<string>();
  const deduped = localOnly.filter((place) => {
    const key = `${place.name.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const ranked = companionFilterActive(companions)
    ? applyCompanionFilter(deduped, companions).slice(0, limit)
    : topPopularPlaces(deduped, limit);
  rememberPlaces(ranked);
  return ranked;
}

async function fetchHomePool(params: {
  location: GeoPoint;
  category: 'attraction' | 'restaurant';
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
    limit: Math.max(limit + 6, 24),
  }).catch(() => [] as Place[]);

  const catalog = searchCatalogNearby({
    location,
    category,
    radiusMeters,
    limit: Math.max(limit + 10, 30),
  });

  try {
    const nearby = await raceWithBudget(
      providers.places.getNearbyPlaces({
        location,
        radiusMeters,
        category,
        limit: Math.max(limit + 6, 24),
        cityLabel,
      }),
      LIVE_BUDGET_MS,
    );
    if (nearby && nearby.length > 0) {
      return [...catalog, ...nearby];
    }
  } catch {
    // Fall through.
  }

  const photon = await photonPromise;
  if (photon.length > 0) {
    return [...catalog, ...photon];
  }

  return catalog;
}

/**
 * Home lists for any city worldwide:
 * OSM (budgeted) → Photon → curated catalog → popularity rank.
 * Every result is distance-checked against the user's coordinates.
 * Sparse cities (e.g. Sorsogon) expand the search radius until enough local hits appear.
 */
export async function getHomeNearbyPlaces(params: {
  location: GeoPoint;
  category: 'attraction' | 'restaurant';
  cityLabel?: string | null;
  radiusMeters: number;
  limit?: number;
  companions?: CompanionPrefs | null;
}): Promise<Place[]> {
  const limit = params.limit ?? DEFAULT_LIMIT;
  const radii = [
    params.radiusMeters,
    Math.max(params.radiusMeters, 35_000),
    Math.max(params.radiusMeters, 80_000),
  ];

  let best: Place[] = [];
  for (const radius of radii) {
    const pool = await fetchHomePool({
      location: params.location,
      category: params.category,
      cityLabel: params.cityLabel,
      radiusMeters: radius,
      limit,
    });
    const ranked = finish(
      pool,
      params.location,
      radius,
      limit,
      params.companions,
      params.cityLabel,
    );
    if (ranked.length >= Math.min(4, limit)) {
      return ranked;
    }
    if (ranked.length > best.length) {
      best = ranked;
    }
  }

  return best;
}
