import {
  filterTripTemplates,
  templateDayDates,
  TRIP_TEMPLATES,
} from '@/services/trips/trip-templates.catalog';
import { eachDayBetween, formatTripDateRange, tripCalendarDays } from '@/utils/dates';

describe('canonical trip dates', () => {
  it('supports open-ended duration via tripCalendarDays', () => {
    const days = tripCalendarDays({
      startDate: '2026-03-10',
      endDate: null,
      openEnded: true,
      durationDays: 5,
    });
    expect(days).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
    ]);
  });

  it('supports long inclusive ranges without day1 columns', () => {
    const days = eachDayBetween('2026-01-01', '2026-01-21');
    expect(days).toHaveLength(21);
    expect(days[0]).toBe('2026-01-01');
    expect(days[20]).toBe('2026-01-21');
  });

  it('formats open-ended ranges', () => {
    expect(formatTripDateRange('2026-03-10', null, true)).toBe('2026-03-10 → open-ended');
  });
});

describe('trip suggestion templates', () => {
  it('exposes complete sample trips not destination-only cards', () => {
    expect(TRIP_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    for (const tpl of TRIP_TEMPLATES) {
      expect(tpl.days.length).toBe(tpl.durationDays);
      expect(tpl.days[0]?.activities.length).toBeGreaterThan(0);
    }
  });

  it('filters by destination and duration', () => {
    const japan15 = filterTripTemplates({ destination: 'Japan', durationDays: 15 });
    expect(japan15.some((t) => t.id === 'japan-golden-route-15')).toBe(true);
    expect(japan15.every((t) => t.durationDays === 15)).toBe(true);
  });

  it('materializes template dates onto a start date', () => {
    const tpl = TRIP_TEMPLATES.find((t) => t.id === 'tokyo-family-explorer-5')!;
    const days = templateDayDates(tpl, '2026-04-01');
    expect(days).toEqual([
      '2026-04-01',
      '2026-04-02',
      '2026-04-03',
      '2026-04-04',
      '2026-04-05',
    ]);
  });
});
