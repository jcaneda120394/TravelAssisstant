import type {
  NearbyPlacesParams,
  PlacesProvider,
  SearchPlacesParams,
} from '@/providers/places/places.provider';
import type { Place } from '@/types/domain';
import { rememberPlaces } from '@/services/places/place-cache';
import { dedupePlaces } from '@/utils/dedupe-places';

/**
 * Prefer Google Places for every lookup; fall back to OSM/Photon provider
 * when Google is unconfigured, rate-limited, or returns too few results.
 */
export class HybridPlacesProvider implements PlacesProvider {
  readonly name = 'hybrid-google-osm';

  constructor(
    private readonly google: PlacesProvider,
    private readonly fallback: PlacesProvider,
  ) {}

  async searchPlaces(params: SearchPlacesParams): Promise<Place[]> {
    try {
      const google = await this.google.searchPlaces(params);
      if (google.length > 0) {
        rememberPlaces(google);
        return google;
      }
    } catch {
      // Fall through.
    }
    const fallback = await this.fallback.searchPlaces(params);
    rememberPlaces(fallback);
    return fallback;
  }

  async getNearbyPlaces(params: NearbyPlacesParams): Promise<Place[]> {
    const limit = params.limit ?? 20;
    let google: Place[] = [];
    try {
      google = await this.google.getNearbyPlaces(params);
    } catch {
      google = [];
    }

    // Enough accurate Google hits → use them (photos already attached).
    if (google.length >= Math.min(8, limit)) {
      const ranked = dedupePlaces(google).slice(0, limit);
      rememberPlaces(ranked);
      return ranked;
    }

    let fallback: Place[] = [];
    try {
      fallback = await this.fallback.getNearbyPlaces(params);
    } catch {
      fallback = [];
    }

    // Prefer Google rows first, then fill gaps from OSM/catalog.
    const merged = dedupePlaces([...google, ...fallback]).slice(0, limit);
    rememberPlaces(merged);
    return merged;
  }

  async getPlaceDetails(placeId: string): Promise<Place | null> {
    if (placeId.startsWith('google-')) {
      try {
        const google = await this.google.getPlaceDetails(placeId);
        if (google) {
          rememberPlaces([google]);
          return google;
        }
      } catch {
        // Fall through.
      }
    }
    return this.fallback.getPlaceDetails(placeId);
  }

  async getPlacePhotos(placeId: string): Promise<string[]> {
    if (placeId.startsWith('google-')) {
      try {
        const photos = await this.google.getPlacePhotos(placeId);
        if (photos.length) return photos;
      } catch {
        // Fall through.
      }
    }
    return this.fallback.getPlacePhotos(placeId);
  }
}
