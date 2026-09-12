import {
  buildRealisticItineraryDays,
  classifyVisit,
  clusterNearbyPlaces,
  estimateRealisticFee,
  estimateTravelMinutes,
  visitDurationMinutes,
} from '@/services/trips/realistic-itinerary.planner';
import type { Place } from '@/types/domain';

function place(partial: Partial<Place> & Pick<Place, 'id' | 'name' | 'latitude' | 'longitude'>): Place {
  return {
    provider: 'test',
    providerPlaceId: partial.id,
    category: partial.category ?? 'attraction',
    ...partial,
  };
}

const shibuya = place({
  id: 'shibuya',
  name: 'Shibuya Crossing',
  latitude: 35.6595,
  longitude: 139.7005,
  category: 'viewpoint',
});
const sensoji = place({
  id: 'senso',
  name: 'Sensō-ji',
  latitude: 35.7148,
  longitude: 139.7967,
  category: 'temple',
});
const skytree = place({
  id: 'sky',
  name: 'Tokyo Skytree',
  latitude: 35.7101,
  longitude: 139.8107,
});
const meiji = place({
  id: 'meiji',
  name: 'Meiji Shrine',
  latitude: 35.6764,
  longitude: 139.6993,
  category: 'temple',
});
const disney = place({
  id: 'disney',
  name: 'Tokyo Disneyland',
  latitude: 35.6329,
  longitude: 139.8804,
  tags: ['theme park'],
});
const disneySea = place({
  id: 'sea',
  name: 'Tokyo DisneySea',
  latitude: 35.6267,
  longitude: 139.8851,
  tags: ['theme park'],
});
const hotel = place({
  id: 'hotel',
  name: 'Hotel near Tokyo Station',
  latitude: 35.6812,
  longitude: 139.7671,
  category: 'hotel',
});
const ramen = place({
  id: 'ramen',
  name: 'Ichiran Shibuya',
  latitude: 35.659,
  longitude: 139.701,
  category: 'restaurant',
});

describe('realistic itinerary planner', () => {
  it('treats Disneyland as a full-day theme park, not a 1–2h stop', () => {
    expect(classifyVisit(disney)).toBe('theme_park');
    expect(visitDurationMinutes('theme_park', 'balanced')).toBeGreaterThanOrEqual(8 * 60);
  });

  it('estimates meaningful travel time between Shibuya and Disneyland', () => {
    const mins = estimateTravelMinutes(
      { latitude: 35.6595, longitude: 139.7005 },
      { latitude: 35.6329, longitude: 139.8804 },
    );
    expect(mins).toBeGreaterThanOrEqual(45);
  });

  it('clusters nearby sights and keeps far theme parks separate', () => {
    const clusters = clusterNearbyPlaces([sensoji, skytree, disney, disneySea], 3_000, 4);
    const flatNonPark = clusters.flat().filter((p) => classifyVisit(p) !== 'theme_park');
    expect(flatNonPark.map((p) => p.id).sort()).toEqual(['senso', 'sky']);
  });

  it('uses realistic park ticket estimates (not ~PHP 250)', () => {
    const fee = estimateRealisticFee('attraction', disney, 'PHP');
    expect(fee.amount).toBeGreaterThanOrEqual(2_500);
    expect(fee.feeLabel.toLowerCase()).toMatch(/confirm/);
  });

  it('builds arrival day with airport process before sightseeing', () => {
    const days = buildRealisticItineraryDays({
      days: ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'],
      cityLabel: 'Tokyo',
      style: 'balanced',
      currency: 'PHP',
      hotel,
      attractions: [sensoji, skytree, meiji, shibuya, disney, disneySea],
      restaurants: [ramen],
      shopping: [],
    });

    const day1 = days[0]!;
    expect(day1.items[0]?.startTime).toBe('08:00');
    expect(day1.items.some((i) => /immigration/i.test(i.title))).toBe(true);
    expect(day1.items.some((i) => /transfer/i.test(i.title))).toBe(true);
    // First sight must not start before ~10:30 (after immigration + setup + transfer)
    const firstAttraction = day1.items.find((i) => i.kind === 'attraction');
    expect(firstAttraction).toBeTruthy();
    const [h, m] = firstAttraction!.startTime.split(':').map(Number);
    expect((h ?? 0) * 60 + (m ?? 0)).toBeGreaterThanOrEqual(10 * 60 + 30);
  });

  it('never schedules Disneyland and DisneySea on the same day', () => {
    const days = buildRealisticItineraryDays({
      days: ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30'],
      cityLabel: 'Tokyo',
      style: 'balanced',
      currency: 'PHP',
      hotel,
      attractions: [sensoji, skytree, meiji, shibuya, disney, disneySea],
      restaurants: [ramen],
      shopping: [],
    });

    for (const day of days) {
      const parkTitles = day.items
        .filter((i) => i.kind === 'attraction' && /disney/i.test(i.title))
        .map((i) => i.title);
      expect(parkTitles.length).toBeLessThanOrEqual(1);
    }

    const disneyDay = days.find((d) =>
      d.items.some((i) => i.kind === 'attraction' && /disneyland/i.test(i.title)),
    );
    expect(disneyDay).toBeTruthy();
    const disneyItem = disneyDay!.items.find(
      (i) => i.kind === 'attraction' && /disneyland/i.test(i.title),
    )!;
    const start = disneyItem.startTime.split(':').map(Number);
    const end = disneyItem.endTime.split(':').map(Number);
    const dur = (end[0]! * 60 + end[1]!) - (start[0]! * 60 + start[1]!);
    expect(dur).toBeGreaterThanOrEqual(7 * 60);
    expect(disneyItem.feeLabel?.toLowerCase()).toMatch(/park ticket|confirm/);
  });
});
