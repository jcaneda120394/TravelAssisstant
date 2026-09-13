import { dedupePlaces } from '@/utils/dedupe-places';
import type { Place } from '@/types/domain';

describe('dedupePlaces', () => {
  it('keeps only one row per place id', () => {
    const places = [
      {
        id: 'osm-node-4504392889',
        name: 'Temple A',
        category: 'temple',
        latitude: 22.32,
        longitude: 103.83,
      },
      {
        id: 'osm-node-4504392889',
        name: 'Temple A (local)',
        category: 'temple',
        latitude: 22.3201,
        longitude: 103.8301,
      },
    ] as Place[];

    const out = dedupePlaces(places);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('osm-node-4504392889');
  });

  it('also drops same name at nearly the same coordinates', () => {
    const places = [
      {
        id: 'a',
        name: 'Cafe Rosita',
        category: 'cafe',
        latitude: 12.3456,
        longitude: 123.4567,
      },
      {
        id: 'b',
        name: 'Cafe Rosita',
        category: 'cafe',
        latitude: 12.34561,
        longitude: 123.45671,
      },
    ] as Place[];

    expect(dedupePlaces(places)).toHaveLength(1);
  });
});
