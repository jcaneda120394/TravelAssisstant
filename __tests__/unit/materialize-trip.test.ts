import {
  activityNotesWithFee,
  buildTransportSegmentSummaries,
  destinationLabels,
  estimateBudgetFromTemplateParts,
  mapSuggestionKindToItineraryKind,
} from '@/services/trips/materialize-trip.service';

describe('materialize trip helpers', () => {
  it('maps suggestion kinds onto itinerary item kinds', () => {
    expect(mapSuggestionKindToItineraryKind('attraction')).toBe('attraction');
    expect(mapSuggestionKindToItineraryKind('restaurant')).toBe('restaurant');
    expect(mapSuggestionKindToItineraryKind('logistics')).toBe('logistics');
    expect(mapSuggestionKindToItineraryKind('break')).toBe('rest');
    expect(mapSuggestionKindToItineraryKind('unknown')).toBe('custom');
  });

  it('folds fee labels into notes', () => {
    expect(
      activityNotesWithFee({
        title: 'Park',
        startTime: '10:00',
        endTime: '12:00',
        notes: 'Bring water',
        feeLabel: '¥1000',
      }),
    ).toBe('Bring water · Fee: ¥1000');
  });

  it('builds transport segments between place-like activities', () => {
    const segments = buildTransportSegmentSummaries([
      {
        title: 'Hotel',
        kind: 'hotel',
        startTime: '08:00',
        endTime: '09:00',
        placeName: 'Hotel A',
      },
      {
        title: 'Transit note',
        kind: 'logistics',
        startTime: '09:00',
        endTime: '09:30',
      },
      {
        title: 'Temple',
        kind: 'attraction',
        startTime: '10:00',
        endTime: '12:00',
        placeName: 'Temple B',
        latitude: 1,
        longitude: 2,
      },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.fromIndex).toBe(0);
    expect(segments[0]?.toIndex).toBe(2);
    expect(segments[0]?.status).toBe('live_data_required');
    expect(segments[0]?.summary).toContain('Hotel A');
    expect(segments[0]?.summary).toContain('Temple B');
  });

  it('preserves multi-destination labels and budget totals', () => {
    expect(destinationLabels([{ label: 'Tokyo' }, { label: ' Kyoto ' }, { label: '' }])).toEqual([
      'Tokyo',
      'Kyoto',
    ]);
    expect(
      estimateBudgetFromTemplateParts({
        accommodation: 100,
        food: 50,
        transport: 25,
        attractions: 40,
        other: 10,
      }),
    ).toBe(225);
  });
});
