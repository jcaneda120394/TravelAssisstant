import { env } from '@/config/env';
import { providers } from '@/providers/registry';
import { searchCatalogNearby, searchPhotonNearby } from '@/services/places/photon-nearby.service';
import { rememberPlaces } from '@/services/places/place-cache';
import type { GeoPoint, Place } from '@/types/domain';
import type { CompanionPrefs } from '@/utils/companion-suitability';
import { applyCompanionFilter, companionFilterActive } from '@/utils/companion-suitability';
import { filterPlacesWithinRadius } from '@/utils/geo';
import { dropForeignLandmarkNoise } from '@/utils/place-foreign-noise';
import { filterPlacesByCategory } from '@/utils/place-category-match';
import { topNearbyPlaces } from '@/utils/place-popularity';
import { dedupePlaces } from '@/utils/dedupe-places';

const DEFAULT_LIMIT = 18;
const LIVE_BUDGET_MS = 6_000;
/** Prefer at least this many local hits before stopping radius expansion. */
const MIN_SATISFYING = 10;

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
  category?: 'attraction' | 'restaurant',
): Place[] {
  const withoutMocks = env.useMockProviders
    ? places
    : places.filter((place) => place.provider !== 'mock');
  const inCategory = filterPlacesByCategory(withoutMocks, category);
  const localOnly = dropForeignLandmarkNoise(
    filterPlacesWithinRadius(inCategory, origin, radiusMeters),
    cityLabel,
  );
  const deduped = dedupePlaces(localOnly);
  const nearFirst = topNearbyPlaces(deduped, Math.max(limit * 2, 40), category);
  const ranked = companionFilterActive(companions)
    ? applyCompanionFilter(nearFirst, companions).slice(0, limit)
    : nearFirst.slice(0, limit);
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
  const fetchLimit = Math.max(limit + 12, 40);

  const photonPromise = searchPhotonNearby({
    location,
    category,
    cityLabel,
    radiusMeters,
    limit: fetchLimit,
  }).catch(() => [] as Place[]);

  const livePromise = providers.places
    .getNearbyPlaces({
      location,
      radiusMeters,
      category,
      limit: fetchLimit,
      cityLabel,
    })
    .catch(() => [] as Place[]);

  const catalog = searchCatalogNearby({
    location,
    category,
    // Respect the active radius — forcing 50km pulled Manila into Bulacan Home feeds.
    radiusMeters,
    limit: Math.max(limit + 16, 40),
  });

  const [nearby, photon] = await Promise.all([
    raceWithBudget(livePromise, LIVE_BUDGET_MS).then((v) => v ?? []),
    raceWithBudget(photonPromise, LIVE_BUDGET_MS).then((v) => v ?? []),
  ]);

  // Never await the live provider again without a budget — a hung Places call
  // left Home Discover stuck on loading after city changes on mobile web.
  return [...catalog, ...nearby, ...photon];
}

/**
 * Home lists for any city worldwide:
 * merge OSM + Photon + curated catalog, then sort closest-first.
 * Every result is distance-checked against the user's coordinates.
 * Sparse areas expand the search radius until enough local hits appear.
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
  // Start tight so "near you" fills with local stops before widening.
  // Cap expansion so Metro Manila landmarks stay out of Bulacan / SJDM Home feeds.
  const maxRadius = Math.min(Math.max(params.radiusMeters, 35_000), 45_000);
  const radii = Array.from(
    new Set([
      Math.min(maxRadius, 12_000),
      Math.min(maxRadius, 20_000),
      Math.min(maxRadius, 28_000),
      maxRadius,
    ]),
  ).sort((a, b) => a - b);

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
      params.category,
    );
    if (ranked.length >= Math.min(MIN_SATISFYING, limit)) {
      return ranked;
    }
    if (ranked.length > best.length) {
      best = ranked;
    }
  }

  return best;
}
