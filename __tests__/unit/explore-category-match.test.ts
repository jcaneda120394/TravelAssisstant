import type { Place, PlaceCategory } from '@/types/domain';
import {
  filterPlacesByCategory,
  placeMatchesCategory,
  isSightseeingCategory,
} from '@/utils/place-category-match';
import { sortPlacesByCategoryPopularity } from '@/utils/place-popularity';
import { searchCatalogNearby } from '@/services/places/photon-nearby.service';

function place(
  partial: Partial<Place> & Pick<Place, 'id' | 'name' | 'category' | 'latitude' | 'longitude'>,
): Place {
  return {
    provider: 'test',
    providerPlaceId: partial.id,
    ...partial,
  };
}

const tokyo = { latitude: 35.68, longitude: 139.76 };

describe('explore category matching', () => {
  const disney = place({
    id: 'disney',
    name: 'Tokyo Disneyland',
    category: 'attraction',
    latitude: 35.63,
    longitude: 139.88,
    tags: ['famous', 'theme park'],
    distanceMeters: 21_300,
  });
  const haneda = place({
    id: 'haneda',
    name: 'Haneda Airport',
    category: 'airport',
    latitude: 35.5494,
    longitude: 139.7798,
    distanceMeters: 14_000,
  });
  const narita = place({
    id: 'narita',
    name: 'Narita International Airport',
    category: 'airport',
    latitude: 35.772,
    longitude: 140.3929,
    distanceMeters: 60_000,
  });

  it('does not treat Disneyland as an airport', () => {
    expect(placeMatchesCategory(disney, 'airport')).toBe(false);
    expect(placeMatchesCategory(haneda, 'airport')).toBe(true);
  });

  it('filters Airport results to airports only', () => {
    const filtered = filterPlacesByCategory([disney, haneda, narita], 'airport');
    expect(filtered.map((p) => p.id).sort()).toEqual(['haneda', 'narita']);
  });

  it('does not inject attraction catalog for airport', () => {
    const catalog = searchCatalogNearby({
      location: tokyo,
      category: 'airport',
      radiusMeters: 50_000,
      limit: 20,
    });
    expect(catalog).toEqual([]);
  });

  it('ranks airports above Disneyland when category is airport', () => {
    const ranked = sortPlacesByCategoryPopularity([disney, haneda], 'airport');
    expect(ranked[0]?.id).toBe('haneda');
  });

  it('keeps Disneyland popular for sightseeing categories', () => {
    expect(isSightseeingCategory('attraction')).toBe(true);
    const ranked = sortPlacesByCategoryPopularity([disney, haneda], 'attraction');
    expect(ranked[0]?.id).toBe('disney');
  });

  it.each([
    ['hotel', 'hotel'],
    ['hospital', 'hospital'],
    ['pharmacy', 'pharmacy'],
    ['transit_station', 'transit_station'],
  ] as Array<[PlaceCategory, PlaceCategory]>)(
    'rejects attraction under %s',
    (category) => {
      expect(placeMatchesCategory(disney, category)).toBe(false);
    },
  );
});
