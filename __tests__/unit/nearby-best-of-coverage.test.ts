import { searchCatalogNearby } from '@/services/places/photon-nearby.service';
import { getWorldNearbyPlaces } from '@/services/places/world-places.catalog';

/** Rural Castile-La Mancha (near Cabañeros) — previously showed ~1 Discover card. */
const CASTILE_LA_MANCHA = { latitude: 39.4, longitude: -4.48 };
/** Dense urban control. */
const MADRID = { latitude: 40.4168, longitude: -3.7038 };
/** Sorsogon / Barcelona PH — sparse coastal town. */
const BARCELONA_SORSOGON = { latitude: 12.867, longitude: 124.14 };

describe('nearby best-of coverage across locations', () => {
  it('fills Castile-La Mancha with multiple curated attractions inside 90km', () => {
    const places = getWorldNearbyPlaces({
      location: CASTILE_LA_MANCHA,
      category: 'attraction',
      radiusMeters: 90_000,
      limit: 24,
    });
    expect(places.length).toBeGreaterThanOrEqual(4);
    expect(places.every((p) => (p.distanceMeters ?? 0) <= 90_000)).toBe(true);
    expect(places.some((p) => /cabañeros|cabaneros/i.test(p.name))).toBe(true);
  });

  it('fills Madrid with a strong local best-of set', () => {
    const places = getWorldNearbyPlaces({
      location: MADRID,
      category: 'attraction',
      radiusMeters: 40_000,
      limit: 24,
    });
    expect(places.length).toBeGreaterThanOrEqual(5);
    expect(places.some((p) => /prado|retiro|royal palace|plaza mayor/i.test(p.name))).toBe(true);
  });

  it('fills Barcelona, Sorsogon with local catalog attractions', () => {
    const places = searchCatalogNearby({
      location: BARCELONA_SORSOGON,
      category: 'attraction',
      radiusMeters: 40_000,
      limit: 30,
    });
    expect(places.length).toBeGreaterThanOrEqual(4);
    expect(
      places.every((p) => !/sagrada|park güell|park guell|la rambla/i.test(p.name)),
    ).toBe(true);
  });

  it('keeps each origin independent — Madrid landmarks stay out of Sorsogon radius', () => {
    const places = getWorldNearbyPlaces({
      location: BARCELONA_SORSOGON,
      category: 'attraction',
      radiusMeters: 80_000,
      limit: 40,
    });
    expect(places.some((p) => /prado|retiro|madrid/i.test(`${p.name} ${p.address}`))).toBe(false);
  });
});
