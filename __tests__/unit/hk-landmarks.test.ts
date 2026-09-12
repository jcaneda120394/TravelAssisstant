import { getWorldCatalogSize, getWorldNearbyPlaces } from '@/services/places/world-places.catalog';
import { sortPlacesByPopularity } from '@/utils/place-popularity';
import type { Place } from '@/types/domain';

describe('Hong Kong landmark discovery', () => {
  const tst = { latitude: 22.297, longitude: 114.172 };

  it('includes Disneyland, Ngong Ping, and Peak Tram in world catalog near TST', () => {
    const places = getWorldNearbyPlaces({
      location: tst,
      category: 'attraction',
      radiusMeters: 40_000,
      limit: 40,
    });
    const names = places.map((place) => place.name.toLowerCase());
    expect(names.some((name) => name.includes('disneyland'))).toBe(true);
    expect(names.some((name) => name.includes('ngong ping'))).toBe(true);
    expect(names.some((name) => name.includes('peak tram'))).toBe(true);
  });

  it('ranks major landmarks above a nearby church', () => {
    const church: Place = {
      id: 'church',
      provider: 'openstreetmap',
      providerPlaceId: '1',
      name: 'Grace Hong Kong Evangelical Church',
      category: 'attraction',
      latitude: 22.3,
      longitude: 114.17,
      distanceMeters: 1100,
      tags: ['place_of_worship', 'house'],
    };
    const disney: Place = {
      id: 'disney',
      provider: 'world-catalog',
      providerPlaceId: 'w-hk-disneyland',
      name: 'Hong Kong Disneyland',
      category: 'attraction',
      latitude: 22.3132,
      longitude: 114.0413,
      distanceMeters: 14_000,
      rating: 4.6,
      reviewCount: 90_000,
      tags: ['theme park', 'famous'],
    };
    const ranked = sortPlacesByPopularity([church, disney]);
    expect(ranked[0]?.id).toBe('disney');
  });
});

describe('world catalog coverage', () => {
  it('has a large curated set across regions', () => {
    expect(getWorldCatalogSize()).toBeGreaterThan(150);
  });

  it('returns many popular Tokyo attractions', () => {
    const places = getWorldNearbyPlaces({
      location: { latitude: 35.68, longitude: 139.76 },
      category: 'attraction',
      radiusMeters: 80_000,
      limit: 40,
    });
    expect(places.length).toBeGreaterThan(10);
    const names = places.map((p) => p.name.toLowerCase()).join(' ');
    expect(names).toMatch(/senso|shibuya|skytree|disney|meiji/);
  });
});
