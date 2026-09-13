import {
  findFlexibleFreeSlot,
  findNextFreeSlot,
  rangesOverlap,
  timeToMinutes,
} from '@/utils/itinerary-time';
import type { ItineraryItem } from '@/types/domain';

describe('itinerary-time', () => {
  it('parses HH:MM', () => {
    expect(timeToMinutes('11:00')).toBe(11 * 60);
    expect(timeToMinutes('9:30')).toBe(9 * 60 + 30);
    expect(timeToMinutes('bad')).toBeNull();
  });

  it('allows back-to-back times but rejects overlap', () => {
    expect(rangesOverlap('11:00', '13:00', '13:00', '15:00')).toBe(false);
    expect(rangesOverlap('11:00', '13:00', '12:00', '14:00')).toBe(true);
    expect(rangesOverlap('11:00', '13:00', '10:00', '11:30')).toBe(true);
  });

  it('finds the next free slot after existing stops', () => {
    const existing = [
      {
        id: '1',
        tripId: 't',
        day: '2026-09-12',
        startTime: '11:00',
        endTime: '13:00',
        title: 'Park',
        order: 0,
      },
      {
        id: '2',
        tripId: 't',
        day: '2026-09-12',
        startTime: '13:00',
        endTime: '15:00',
        title: 'Esplanade',
        order: 1,
      },
    ] as ItineraryItem[];

    expect(findNextFreeSlot(existing, 120)).toEqual({
      startTime: '09:00',
      endTime: '11:00',
    });
    expect(findNextFreeSlot(existing, 120, 11 * 60)).toEqual({
      startTime: '15:00',
      endTime: '17:00',
    });
  });

  it('packs a short stop onto a full day via flexible slot', () => {
    const packed = [
      {
        id: '1',
        tripId: 't',
        day: '2026-09-12',
        startTime: '09:00',
        endTime: '22:00',
        title: 'Full day',
        order: 0,
      },
    ] as ItineraryItem[];

    expect(findNextFreeSlot(packed, 120)).toBeNull();
    expect(findFlexibleFreeSlot(packed, 120)).toEqual({
      startTime: '22:00',
      endTime: '22:30',
    });
  });
});
