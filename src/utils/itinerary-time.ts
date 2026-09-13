import type { ItineraryItem } from '@/types/domain';

/** Parse "HH:MM" (or "H:MM") into minutes from midnight. Invalid → null. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Half-open ranges [start, end): back-to-back (11:00–13:00 then 13:00–15:00) is OK.
 * Overlap when startA < endB && startB < endA.
 */
export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  if (a0 == null || a1 == null || b0 == null || b1 == null) {
    return false;
  }
  if (a1 <= a0 || b1 <= b0) {
    return false;
  }
  return a0 < b1 && b0 < a1;
}

export function findOverlappingItem(
  existing: ItineraryItem[],
  startTime: string,
  endTime: string,
  excludeId?: string,
): ItineraryItem | null {
  for (const item of existing) {
    if (excludeId && item.id === excludeId) {
      continue;
    }
    if (rangesOverlap(startTime, endTime, item.startTime, item.endTime)) {
      return item;
    }
  }
  return null;
}

export function assertNoTimeOverlap(input: {
  existing: ItineraryItem[];
  startTime: string;
  endTime: string;
  excludeId?: string;
}): void {
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  if (start == null || end == null) {
    throw new Error('Use a valid time like 11:00');
  }
  if (end <= start) {
    throw new Error('End time must be after start time');
  }
  const conflict = findOverlappingItem(
    input.existing,
    input.startTime,
    input.endTime,
    input.excludeId,
  );
  if (conflict) {
    throw new Error(
      `Time overlaps “${conflict.title}” (${conflict.startTime}–${conflict.endTime}). Pick another time.`,
    );
  }
}

/** Next free slot on the day (default 60–120 min), starting from 09:00. */
export function findNextFreeSlot(
  existing: ItineraryItem[],
  durationMinutes = 120,
  dayStartMinutes = 9 * 60,
  dayEndMinutes = 22 * 60,
): { startTime: string; endTime: string } | null {
  const sorted = [...existing].sort(
    (a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0),
  );

  let cursor = dayStartMinutes;
  for (const item of sorted) {
    const itemStart = timeToMinutes(item.startTime);
    const itemEnd = timeToMinutes(item.endTime);
    if (itemStart == null || itemEnd == null) {
      continue;
    }
    if (cursor + durationMinutes <= itemStart) {
      return {
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + durationMinutes),
      };
    }
    cursor = Math.max(cursor, itemEnd);
  }

  if (cursor + durationMinutes <= dayEndMinutes) {
    return {
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + durationMinutes),
    };
  }
  return null;
}

/**
 * Prefer a longer gap, then shrink duration so packed AI days can still accept a stop.
 * Last resort: append 30 minutes after the last item (up to 23:45).
 */
export function findFlexibleFreeSlot(
  existing: ItineraryItem[],
  preferredDurationMinutes = 120,
): { startTime: string; endTime: string } | null {
  const durations = [
    preferredDurationMinutes,
    90,
    60,
    45,
    30,
  ].filter((value, index, all) => value > 0 && all.indexOf(value) === index);

  for (const duration of durations) {
    const slot = findNextFreeSlot(existing, duration);
    if (slot) return slot;
  }

  const sorted = [...existing].sort(
    (a, b) => (timeToMinutes(a.startTime) ?? 0) - (timeToMinutes(b.startTime) ?? 0),
  );
  const lastEnd = sorted.reduce((max, item) => {
    const end = timeToMinutes(item.endTime);
    return end == null ? max : Math.max(max, end);
  }, 9 * 60);
  const start = Math.max(lastEnd, 9 * 60);
  const end = start + 30;
  if (end <= 23 * 60 + 45) {
    return {
      startTime: minutesToTime(start),
      endTime: minutesToTime(end),
    };
  }
  return null;
}
