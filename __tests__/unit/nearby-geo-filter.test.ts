import { MockPlacesProvider } from '@/providers/places/mock-places.provider';
import { filterPlacesWithinRadius, haversineMeters } from '@/utils/geo';

const SJDM = { latitude: 14.8136, longitude: 121.0453 };
const SHIBUYA = { latitude: 35.6595, longitude: 139.7005 };
const TOKYO_LANDMARK = {
  id: 'w-tokyo-shibuya',
  provider: 'catalog' as const,
  providerPlaceId: 'w-tokyo-shibuya',
  name: 'Shibuya Crossing',
  category: 'attraction' as const,
  latitude: 35.6595,
  longitude: 139.7005,
  address: 'Shibuya, Tokyo',
  distanceMeters: 500,
};

describe('nearby geo filtering', () => {
  it('computes ~3000km between SJDM and Shibuya', () => {
    const meters = haversineMeters(SJDM, SHIBUYA);
    expect(meters).toBeGreaterThan(2_500_000);
  });

  it('drops Tokyo landmarks when origin is San Jose del Monte', () => {
    const filtered = filterPlacesWithinRadius([TOKYO_LANDMARK], SJDM, 15_000);
    expect(filtered).toHaveLength(0);
  });

  it('keeps Tokyo landmarks when origin is Shibuya', () => {
    const filtered = filterPlacesWithinRadius([TOKYO_LANDMARK], SHIBUYA, 15_000);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.distanceMeters).toBeLessThan(2_000);
  });

  it('mock nearby provider never returns Shibuya-named places', async () => {
    const provider = new MockPlacesProvider();
    const places = await provider.getNearbyPlaces({
      location: SJDM,
      radiusMeters: 15_000,
      category: 'attraction',
    });
    expect(places.some((p) => /shibuya/i.test(p.name))).toBe(false);
    expect(places.length).toBeGreaterThan(0);
    for (const place of places) {
      expect(place.distanceMeters ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(15_150);
    }
  });

  it('mock restaurant distances are relative to the request origin', async () => {
    const provider = new MockPlacesProvider();
    const places = await provider.getNearbyPlaces({
      location: SJDM,
      radiusMeters: 15_000,
      category: 'restaurant',
    });
    expect(places.length).toBeGreaterThan(0);
    expect(places.every((p) => !/shibuya|dogenzaka|tokyo/i.test(`${p.name} ${p.address}`))).toBe(
      true,
    );
  });
});
