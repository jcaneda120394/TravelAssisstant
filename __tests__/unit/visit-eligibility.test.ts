import { hasVisitedFromSources } from '@/services/travel-spots/visit-eligibility';

describe('hasVisitedFromSources', () => {
  it('returns true when the user checked in', () => {
    expect(
      hasVisitedFromSources('place-1', {
        checkInPlaceIds: ['place-1'],
        pastItineraryPlaceIds: [],
      }),
    ).toBe(true);
  });

  it('returns true when the place is on a past itinerary day', () => {
    expect(
      hasVisitedFromSources('place-2', {
        checkInPlaceIds: [],
        pastItineraryPlaceIds: new Set(['place-2', 'place-9']),
      }),
    ).toBe(true);
  });

  it('returns false when neither check-in nor past itinerary matches', () => {
    expect(
      hasVisitedFromSources('place-3', {
        checkInPlaceIds: ['place-1'],
        pastItineraryPlaceIds: ['place-2'],
      }),
    ).toBe(false);
  });
});
