import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import type { ItineraryItem } from '@/types/domain';

const KEY = 'itinerary_items';

export async function listItinerary(tripId: string, day?: string): Promise<ItineraryItem[]> {
  const items = await dbGet<ItineraryItem[]>(KEY, []);
  return items
    .filter((item) => item.tripId === tripId && (day ? item.day === day : true))
    .sort((a, b) => a.order - b.order || a.startTime.localeCompare(b.startTime));
}

export async function addItineraryItem(
  input: Omit<ItineraryItem, 'id' | 'order'> & { order?: number },
): Promise<ItineraryItem> {
  const items = await dbGet<ItineraryItem[]>(KEY, []);
  const sameDay = items.filter((item) => item.tripId === input.tripId && item.day === input.day);
  const item: ItineraryItem = {
    ...input,
    id: createId('itin'),
    order: input.order ?? sameDay.length,
  };
  await dbSet(KEY, [...items, item]);
  return item;
}

export async function updateItineraryItem(
  id: string,
  patch: Partial<ItineraryItem>,
): Promise<ItineraryItem> {
  const items = await dbGet<ItineraryItem[]>(KEY, []);
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error('Itinerary item not found');
  }
  const current = items[index];
  if (!current) {
    throw new Error('Itinerary item not found');
  }
  const next = { ...current, ...patch };
  items[index] = next;
  await dbSet(KEY, items);
  return next;
}

export async function removeItineraryItem(id: string): Promise<void> {
  const items = await dbGet<ItineraryItem[]>(KEY, []);
  await dbSet(
    KEY,
    items.filter((item) => item.id !== id),
  );
}

export async function reorderItinerary(tripId: string, day: string, orderedIds: string[]) {
  const items = await dbGet<ItineraryItem[]>(KEY, []);
  const next = items.map((item) => {
    if (item.tripId !== tripId || item.day !== day) {
      return item;
    }
    const order = orderedIds.indexOf(item.id);
    return order >= 0 ? { ...item, order } : item;
  });
  await dbSet(KEY, next);
}

export async function optimizeItineraryDay(tripId: string, day: string): Promise<ItineraryItem[]> {
  const items = await listItinerary(tripId, day);
  const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));
  await reorderItinerary(
    tripId,
    day,
    sorted.map((item) => item.id),
  );
  return listItinerary(tripId, day);
}
