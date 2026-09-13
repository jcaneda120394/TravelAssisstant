import type { GeoPoint, Place, PlaceCategory } from '@/types/domain';

export type NearbyPlacesParams = {
  location: GeoPoint;
  radiusMeters: number;
  category?: PlaceCategory;
  query?: string;
  limit?: number;
  /** Full destination label for local text search (e.g. "Barcelona, Sorsogon, Philippines"). */
  cityLabel?: string | null;
  /** ISO country code when known (e.g. PH) — used to reject wrong-country hits. */
  countryCode?: string | null;
};

export type SearchPlacesParams = {
  query: string;
  location?: GeoPoint;
  limit?: number;
};

export interface PlacesProvider {
  readonly name: string;
  searchPlaces(params: SearchPlacesParams): Promise<Place[]>;
  getNearbyPlaces(params: NearbyPlacesParams): Promise<Place[]>;
  getPlaceDetails(placeId: string): Promise<Place | null>;
  getPlacePhotos(placeId: string): Promise<string[]>;
}
