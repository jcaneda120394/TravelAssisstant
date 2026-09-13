import type {
  NearbyPlacesParams,
  PlacesProvider,
  SearchPlacesParams,
} from '@/providers/places/places.provider';
import type { Place, PlaceCategory } from '@/types/domain';
import { filterPlacesWithinRadius, haversineMeters } from '@/utils/geo';

/**
 * Demo POIs are generated around the *request* origin so they never appear as
 * another city (e.g. Shibuya) when the traveler is elsewhere.
 */
function buildDemoPlaces(origin: { latitude: number; longitude: number }): Place[] {
  const templates: Array<{
    id: string;
    name: string;
    category: PlaceCategory;
    dLat: number;
    dLon: number;
    address: string;
    rating?: number;
    reviewCount?: number;
    priceLevel?: number;
    priceRange?: string;
    tags?: string[];
    description?: string;
  }> = [
    {
      id: 'mock-breakfast-1',
      name: 'Local Morning Kitchen',
      category: 'restaurant',
      dLat: 0.002,
      dLon: 0.001,
      address: 'Near your location',
      rating: 4.6,
      reviewCount: 312,
      priceLevel: 2,
      priceRange: 'Budget–mid',
      tags: ['breakfast', 'local'],
      description: 'Demo restaurant near your selected city.',
    },
    {
      id: 'mock-lunch-1',
      name: 'Neighborhood Noodle Counter',
      category: 'restaurant',
      dLat: 0.004,
      dLon: -0.001,
      address: 'Near your location',
      rating: 4.7,
      reviewCount: 980,
      priceLevel: 1,
      priceRange: 'Budget',
      tags: ['lunch', 'noodles'],
      description: 'Demo lunch spot for offline / mock mode.',
    },
    {
      id: 'mock-attraction-1',
      name: 'City Viewpoint',
      category: 'attraction',
      dLat: 0.001,
      dLon: 0.002,
      address: 'Near your location',
      rating: 4.8,
      reviewCount: 1520,
      tags: ['viewpoint'],
      description: 'Demo attraction near your selected city.',
    },
    {
      id: 'mock-museum-1',
      name: 'City Design Museum',
      category: 'attraction',
      dLat: 0.006,
      dLon: 0.003,
      address: 'Near your location',
      rating: 4.5,
      reviewCount: 220,
      tags: ['museum', 'indoor'],
    },
    {
      id: 'mock-hospital-1',
      name: 'Central Emergency Hospital',
      category: 'hospital',
      dLat: -0.003,
      dLon: 0.004,
      address: 'Near your location',
      rating: 4.2,
      tags: ['emergency'],
    },
    {
      id: 'mock-clinic-1',
      name: 'Walk-in Travel Clinic',
      category: 'clinic',
      dLat: -0.001,
      dLon: -0.002,
      address: 'Near your location',
    },
    {
      id: 'mock-pharmacy-1',
      name: 'Station Pharmacy',
      category: 'pharmacy',
      dLat: 0.0005,
      dLon: -0.0008,
      address: 'Near your location',
      rating: 4.3,
    },
    {
      id: 'mock-police-1',
      name: 'Local Police Station',
      category: 'police',
      dLat: 0.0008,
      dLon: 0.0004,
      address: 'Near your location',
    },
    {
      id: 'mock-atm-1',
      name: 'Convenience ATM',
      category: 'atm',
      dLat: 0.0012,
      dLon: -0.0015,
      address: 'Near your location',
    },
    {
      id: 'mock-cowork-1',
      name: 'Nomad Hub Coworking',
      category: 'coworking',
      dLat: 0.0035,
      dLon: 0.0025,
      address: 'Near your location',
      rating: 4.6,
      tags: ['wifi', 'power'],
    },
    {
      id: 'mock-station-1',
      name: 'Central Transit Station',
      category: 'transit_station',
      dLat: 0,
      dLon: 0,
      address: 'Near your location',
      tags: ['transit'],
    },
    {
      id: 'mock-hotel-place-1',
      name: 'Station Front Hotel',
      category: 'hotel',
      dLat: -0.002,
      dLon: 0.0015,
      address: 'Near your location',
      rating: 4.4,
      priceRange: 'Mid-range',
    },
  ];

  return templates.map((t) => {
    const latitude = origin.latitude + t.dLat;
    const longitude = origin.longitude + t.dLon;
    return {
      id: t.id,
      provider: 'mock' as const,
      providerPlaceId: t.id,
      name: t.name,
      category: t.category,
      latitude,
      longitude,
      address: t.address,
      rating: t.rating,
      reviewCount: t.reviewCount,
      priceLevel: t.priceLevel,
      priceRange: t.priceRange,
      tags: t.tags,
      description: t.description,
      distanceMeters: Math.round(
        haversineMeters(origin, { latitude, longitude }),
      ),
      isOpen: true,
    };
  });
}

/** @deprecated Kept for tests — demo places around a neutral origin. */
export const MOCK_PLACES: Place[] = buildDemoPlaces({
  latitude: 14.5995,
  longitude: 120.9842,
});

export class MockPlacesProvider implements PlacesProvider {
  readonly name = 'mock-places';

  async searchPlaces(params: SearchPlacesParams): Promise<Place[]> {
    const origin = params.location ?? { latitude: 14.5995, longitude: 120.9842 };
    const q = params.query.toLowerCase();
    return buildDemoPlaces(origin)
      .filter(
        (placeItem) =>
          placeItem.name.toLowerCase().includes(q) ||
          placeItem.category.includes(q) ||
          placeItem.tags?.some((tag) => tag.includes(q)),
      )
      .slice(0, params.limit ?? 20);
  }

  async getNearbyPlaces(params: NearbyPlacesParams): Promise<Place[]> {
    const places = buildDemoPlaces(params.location).filter((placeItem) =>
      params.category ? placeItem.category === params.category : true,
    ).filter((placeItem) =>
      params.query ? placeItem.name.toLowerCase().includes(params.query.toLowerCase()) : true,
    );

    return filterPlacesWithinRadius(places, params.location, params.radiusMeters).slice(
      0,
      params.limit ?? 30,
    );
  }

  async getPlaceDetails(placeId: string): Promise<Place | null> {
    return MOCK_PLACES.find((placeItem) => placeItem.id === placeId) ?? null;
  }

  async getPlacePhotos(_placeId: string): Promise<string[]> {
    return [];
  }
}

export function getMockPlacesByCategory(category: PlaceCategory): Place[] {
  return MOCK_PLACES.filter((placeItem) => placeItem.category === category);
}
