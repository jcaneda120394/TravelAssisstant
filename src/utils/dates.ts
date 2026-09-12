export function toIsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Local calendar today at midnight (for date-picker minimums). */
export function startOfLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/** Local YYYY-MM-DD (avoids UTC day-shift from toISOString). */
export function toLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(days: number, from = new Date()): string {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days, 12, 0, 0, 0);
  return toLocalIsoDate(next);
}

export function defaultTripDates() {
  return {
    startDate: toLocalIsoDate(),
    endDate: addDaysIso(7),
  };
}

const MAX_TRIP_DAYS = 120;

/**
 * Inclusive list of YYYY-MM-DD dates between start and end.
 * Caps at MAX_TRIP_DAYS for UI/performance; longer trips use week grouping in UI.
 */
export function eachDayBetween(startDate: string, endDate: string | null | undefined): string[] {
  const start = new Date(`${startDate}T12:00:00`);
  const endIso = endDate && endDate.length >= 10 ? endDate : startDate;
  const end = new Date(`${endIso}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [startDate || toLocalIsoDate()];
  }
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < MAX_TRIP_DAYS) {
    days.push(toLocalIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Resolve itinerary day list for a trip (supports open-ended via durationDays). */
export function tripCalendarDays(input: {
  startDate: string;
  endDate?: string | null;
  openEnded?: boolean;
  /** When open-ended or missing end, how many days to materialize (default 1). */
  durationDays?: number;
}): string[] {
  if (input.openEnded || !input.endDate) {
    const n = Math.max(1, Math.min(MAX_TRIP_DAYS, input.durationDays ?? 1));
    return eachDayBetween(input.startDate, addDaysIso(n - 1, new Date(`${input.startDate}T12:00:00`)));
  }
  return eachDayBetween(input.startDate, input.endDate);
}

export function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTripDateRange(startDate: string, endDate?: string | null, openEnded?: boolean): string {
  if (openEnded || !endDate) {
    return `${startDate} → open-ended`;
  }
  if (startDate === endDate) {
    return startDate;
  }
  return `${startDate} → ${endDate}`;
}

export function tripDayCount(startDate: string, endDate?: string | null, openEnded?: boolean, durationDays?: number): number {
  return tripCalendarDays({ startDate, endDate, openEnded, durationDays }).length;
}
