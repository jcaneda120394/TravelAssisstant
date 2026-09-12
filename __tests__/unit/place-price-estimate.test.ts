import type { Place } from '@/types/domain';
import {
  estimatePlacePrice,
  formatPlaceRating,
  isFreeOutdoorLandmark,
  isPaidAdmissionAttraction,
} from '@/utils/place-price-estimate';

function place(partial: Partial<Place> & Pick<Place, 'id' | 'name' | 'category'>): Place {
  return {
    provider: 'test',
    providerPlaceId: partial.id,
    latitude: 35.68,
    longitude: 139.76,
    ...partial,
  };
}

describe('place price estimates', () => {
  it('shows hotel range per night in PHP', () => {
    const est = estimatePlacePrice(place({ id: 'h1', name: 'Sakura Hotel', category: 'hotel' }), 'PHP');
    expect(est?.unit).toBe('night');
    expect(est?.label).toMatch(/Est\. ₱.+–.+ \/ night/);
    expect(est!.min).toBeGreaterThan(0);
    expect(est!.max).toBeGreaterThan(est!.min);
  });

  it('shows restaurant meal range', () => {
    const est = estimatePlacePrice(
      place({ id: 'r1', name: 'Ichiran', category: 'restaurant', cuisine: 'ramen' }),
      'PHP',
    );
    expect(est?.unit).toBe('meal');
    expect(est?.label).toMatch(/\/ meal/);
  });

  it('shows theme park ticket range', () => {
    const est = estimatePlacePrice(
      place({
        id: 'd1',
        name: 'Tokyo Disneyland',
        category: 'attraction',
        tags: ['theme park'],
      }),
      'PHP',
    );
    expect(est?.unit).toBe('ticket');
    expect(est!.min).toBeGreaterThan(2000);
  });

  it('marks Shibuya Crossing as free, not a ticket', () => {
    const shibuya = place({
      id: 'w-tokyo-shibuya',
      name: 'Shibuya Crossing',
      category: 'attraction',
      tags: ['famous', 'landmark'],
    });
    expect(isFreeOutdoorLandmark(shibuya)).toBe(true);
    expect(isPaidAdmissionAttraction(shibuya)).toBe(false);
    const est = estimatePlacePrice(shibuya, 'PHP');
    expect(est?.unit).toBe('free');
    expect(est?.label).toMatch(/free/i);
    expect(est?.min).toBe(0);
  });

  it('keeps paid observation decks as tickets', () => {
    const sky = place({
      id: 'sky',
      name: 'Shibuya Sky',
      category: 'attraction',
      tags: ['observation'],
    });
    expect(isPaidAdmissionAttraction(sky)).toBe(true);
    expect(estimatePlacePrice(sky, 'PHP')?.unit).toBe('ticket');
  });

  it('does not invent tickets for unknown attractions', () => {
    const est = estimatePlacePrice(
      place({ id: 'x', name: 'Local Lookout Spot', category: 'attraction' }),
      'PHP',
    );
    expect(est?.unit).toBe('unknown');
    expect(est?.label).toMatch(/confirm/i);
  });

  it('uses OSM free fee tag when present', () => {
    const est = estimatePlacePrice(
      place({
        id: 'p',
        name: 'City Plaza',
        category: 'attraction',
        priceRange: 'Free entry',
      }),
      'PHP',
    );
    expect(est?.unit).toBe('free');
    expect(est?.label).toBe('Free entry');
  });

  it('formats star ratings when present', () => {
    expect(
      formatPlaceRating(
        place({ id: 'a', name: 'A', category: 'hotel', rating: 4.6, reviewCount: 1200 }),
      ),
    ).toBe('4.6★ (1,200)');
    expect(formatPlaceRating(place({ id: 'b', name: 'B', category: 'hotel' }))).toBeNull();
  });
});
