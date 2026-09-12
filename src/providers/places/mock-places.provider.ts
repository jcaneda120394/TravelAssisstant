import type {
  NearbyPlacesParams,
  PlacesProvider,
  SearchPlacesParams,
} from '@/providers/places/places.provider';
import type { Place, PlaceCategory } from '@/types/domain';

const BASE = { latitude: 35.6595, longitude: 139.7005 };

function place(
  partial: Omit<Place, 'provider' | 'providerPlaceId'> & { id: string },
): Place {
  return {
    provider: 'mock',
    providerPlaceId: partial.id,
    ...partial,
  };
}

export const MOCK_PLACES: Place[] = [
  place({
    id: 'mock-breakfast-1',
    name: 'Shibuya Morning Kitchen',
    category: 'restaurant',
    latitude: BASE.latitude + 0.002,
    longitude: BASE.longitude + 0.001,
    address: '1-2 Shibuya',
    rating: 4.6,
    reviewCount: 312,
    priceLevel: 2,
    priceRange: '¥1,000–¥1,500',
    distanceMeters: 350,
    isOpen: true,
    openingHours: ['07:00–14:00'],
    tags: ['breakfast', 'local'],
    description: 'Highly rated local breakfast near the station.',
    phone: '+81-3-0000-0001',
  }),
  place({
    id: 'mock-lunch-1',
    name: 'Ramen Alley Counter',
    category: 'restaurant',
    latitude: BASE.latitude + 0.004,
    longitude: BASE.longitude - 0.001,
    address: '3-8 Dogenzaka',
    rating: 4.7,
    reviewCount: 980,
    priceLevel: 1,
    priceRange: '¥900–¥1,200',
    distanceMeters: 600,
    isOpen: true,
    tags: ['lunch', 'ramen'],
    description: 'Busy local ramen spot popular with travelers.',
  }),
  place({
    id: 'mock-attraction-1',
    name: 'Shibuya Sky',
    category: 'attraction',
    latitude: BASE.latitude + 0.001,
    longitude: BASE.longitude + 0.002,
    address: 'Shibuya Scramble Square',
    rating: 4.8,
    reviewCount: 15200,
    distanceMeters: 500,
    isOpen: true,
    openingHours: ['10:00–22:00'],
    tags: ['viewpoint'],
    description: 'Observation deck with city views.',
  }),
  place({
    id: 'mock-museum-1',
    name: 'City Design Museum',
    category: 'attraction',
    latitude: BASE.latitude + 0.006,
    longitude: BASE.longitude + 0.003,
    address: '4-1 Museum Ave',
    rating: 4.5,
    reviewCount: 2200,
    distanceMeters: 1100,
    isOpen: true,
    tags: ['museum', 'indoor'],
  }),
  place({
    id: 'mock-hospital-1',
    name: 'Central Emergency Hospital',
    category: 'hospital',
    latitude: BASE.latitude - 0.003,
    longitude: BASE.longitude + 0.004,
    address: '9-1 Medical Plaza',
    rating: 4.2,
    distanceMeters: 900,
    phone: '+81-3-0000-9110',
    isOpen: true,
    tags: ['emergency'],
  }),
  place({
    id: 'mock-clinic-1',
    name: 'Walk-in Travel Clinic',
    category: 'clinic',
    latitude: BASE.latitude - 0.001,
    longitude: BASE.longitude - 0.002,
    address: '2-4 Health Street',
    distanceMeters: 450,
    phone: '+81-3-0000-2200',
    isOpen: true,
  }),
  place({
    id: 'mock-pharmacy-1',
    name: 'Station Pharmacy',
    category: 'pharmacy',
    latitude: BASE.latitude + 0.0005,
    longitude: BASE.longitude - 0.0008,
    address: 'Station Plaza B1',
    rating: 4.3,
    distanceMeters: 200,
    phone: '+81-3-0000-3300',
    isOpen: true,
  }),
  place({
    id: 'mock-police-1',
    name: 'Shibuya Police Box',
    category: 'police',
    latitude: BASE.latitude + 0.0008,
    longitude: BASE.longitude + 0.0004,
    address: 'Scramble crossing',
    distanceMeters: 180,
    phone: '110',
  }),
  place({
    id: 'mock-atm-1',
    name: '7-Eleven ATM',
    category: 'atm',
    latitude: BASE.latitude + 0.0012,
    longitude: BASE.longitude - 0.0015,
    address: 'Convenience corner',
    distanceMeters: 260,
    isOpen: true,
  }),
  place({
    id: 'mock-cowork-1',
    name: 'Nomad Hub Shibuya',
    category: 'coworking',
    latitude: BASE.latitude + 0.0035,
    longitude: BASE.longitude + 0.0025,
    address: '5-12 Work Lane',
    rating: 4.6,
    distanceMeters: 750,
    priceRange: 'Day pass ¥3,500',
    tags: ['wifi', 'power'],
    isOpen: true,
  }),
  place({
    id: 'mock-station-1',
    name: 'Shibuya Station',
    category: 'transit_station',
    latitude: BASE.latitude,
    longitude: BASE.longitude,
    address: 'Shibuya Station',
    distanceMeters: 120,
    tags: ['subway', 'train'],
  }),
  place({
    id: 'mock-embassy-1',
    name: 'Sample Embassy Consular Section',
    category: 'embassy',
    latitude: BASE.latitude + 0.01,
    longitude: BASE.longitude + 0.008,
    address: '1-1 Diplomatic Ave',
    distanceMeters: 2400,
    phone: '+81-3-0000-4400',
    openingHours: ['09:00–17:00'],
  }),
  place({
    id: 'mock-hotel-place-1',
    name: 'Station Front Hotel',
    category: 'hotel',
    latitude: BASE.latitude - 0.002,
    longitude: BASE.longitude + 0.0015,
    address: 'Hotel Row 1',
    rating: 4.4,
    distanceMeters: 400,
    priceRange: 'From ¥18,000',
  }),
];

export class MockPlacesProvider implements PlacesProvider {
  readonly name = 'mock-places';

  async searchPlaces(params: SearchPlacesParams): Promise<Place[]> {
    const q = params.query.toLowerCase();
    return MOCK_PLACES.filter(
      (placeItem) =>
        placeItem.name.toLowerCase().includes(q) ||
        placeItem.category.includes(q) ||
        placeItem.tags?.some((tag) => tag.includes(q)),
    ).slice(0, params.limit ?? 20);
  }

  async getNearbyPlaces(params: NearbyPlacesParams): Promise<Place[]> {
    return MOCK_PLACES.filter((placeItem) =>
      params.category ? placeItem.category === params.category : true,
    )
      .filter((placeItem) => (placeItem.distanceMeters ?? 0) <= params.radiusMeters)
      .filter((placeItem) =>
        params.query
          ? placeItem.name.toLowerCase().includes(params.query.toLowerCase())
          : true,
      )
      .slice(0, params.limit ?? 30);
  }

  async getPlaceDetails(placeId: string): Promise<Place | null> {
    return MOCK_PLACES.find((placeItem) => placeItem.id === placeId) ?? null;
  }

  async getPlacePhotos(_placeId: string): Promise<string[]> {
    return [];
  }
}

export function placesByCategories(categories: PlaceCategory[]): Place[] {
  return MOCK_PLACES.filter((placeItem) => categories.includes(placeItem.category));
}
