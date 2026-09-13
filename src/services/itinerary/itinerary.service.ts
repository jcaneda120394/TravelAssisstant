import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import type { ItineraryItem, Place } from '@/types/domain';
import { toIsoDate } from '@/utils/dates';
import { assertNoTimeOverlap, findFlexibleFreeSlot } from '@/utils/itinerary-time';

const KEY = 'itinerary_items';

type ItineraryRow = {
  id: string;
  trip_id: string;
  day: string;
  start_time: string;
  end_time: string;
  title: string;
  place_id: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  estimated_cost: number | null;
  currency: string | null;
  notes: string | null;
  transport_summary: string | null;
  sort_order: number;
  item_kind?: string | null;
  priority?: string | null;
  flexibility?: string | null;
  item_status?: string | null;
  data_confidence?: string | null;
};

function mapItem(row: ItineraryRow): ItineraryItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    day: row.day,
    startTime: row.start_time,
    endTime: row.end_time,
    title: row.title,
    kind: (row.item_kind as ItineraryItem['kind']) || undefined,
    priority: (row.priority as ItineraryItem['priority']) || undefined,
    flexibility: (row.flexibility as ItineraryItem['flexibility']) || undefined,
    itemStatus: (row.item_status as ItineraryItem['itemStatus']) || undefined,
    dataConfidence: (row.data_confidence as ItineraryItem['dataConfidence']) || undefined,
    placeId: row.place_id ?? undefined,
    placeName: row.place_name ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    estimatedCost: row.estimated_cost ?? undefined,
    currency: row.currency ?? undefined,
    notes: row.notes ?? undefined,
    transportSummary: row.transport_summary ?? undefined,
    order: row.sort_order,
  };
}

export async function listItinerary(tripId: string, day?: string): Promise<ItineraryItem[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    let query = supabase.from('itinerary_items').select('*').eq('trip_id', tripId);
    if (day) {
      query = query.eq('day', day);
    }
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) {
      throw error;
    }
    return (data as ItineraryRow[]).map(mapItem);
  }

  const items = await dbGet<ItineraryItem[]>(KEY, []);
  return items
    .filter((item) => item.tripId === tripId && (day ? item.day === day : true))
    .sort((a, b) => a.order - b.order || a.startTime.localeCompare(b.startTime));
}

type AddItineraryItemInput = Omit<ItineraryItem, 'id' | 'order'> & { order?: number };

function toItineraryInsertPayload(
  input: AddItineraryItemInput,
  sortOrder: number,
  includeExtensions: boolean,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    trip_id: input.tripId,
    day: input.day,
    start_time: input.startTime,
    end_time: input.endTime,
    title: input.title,
    place_id: input.placeId ?? null,
    place_name: input.placeName ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    estimated_cost: input.estimatedCost ?? null,
    currency: input.currency ?? null,
    notes: input.notes ?? null,
    transport_summary: input.transportSummary ?? null,
    sort_order: sortOrder,
  };
  if (!includeExtensions) {
    return base;
  }
  return {
    ...base,
    item_kind: input.kind ?? 'custom',
    priority: input.priority ?? 'recommended',
    flexibility: input.flexibility ?? 'flexible',
    item_status: input.itemStatus ?? 'planned',
    data_confidence: input.dataConfidence ?? 'suggested',
  };
}

/**
 * Insert many items for one trip/day with a single list + single insert.
 * When skipOverlaps is true, overlapping inputs are dropped (materialize path).
 * Otherwise the first overlap throws, matching addItineraryItem.
 */
export async function addItineraryItemsBatch(
  inputs: AddItineraryItemInput[],
  options?: { skipOverlaps?: boolean },
): Promise<ItineraryItem[]> {
  if (!inputs.length) {
    return [];
  }

  const tripId = inputs[0]!.tripId;
  const day = inputs[0]!.day;
  if (inputs.some((item) => item.tripId !== tripId || item.day !== day)) {
    throw new Error('addItineraryItemsBatch requires the same tripId and day');
  }

  const existing = await listItinerary(tripId, day);
  const accepted: AddItineraryItemInput[] = [];
  const known: ItineraryItem[] = [...existing];
  const skipOverlaps = options?.skipOverlaps === true;

  for (const input of inputs) {
    try {
      assertNoTimeOverlap({
        existing: known,
        startTime: input.startTime,
        endTime: input.endTime,
      });
    } catch (error) {
      if (skipOverlaps && error instanceof Error && /overlap/i.test(error.message)) {
        continue;
      }
      throw error;
    }
    accepted.push(input);
    // Placeholder so later batch members see this slot as taken.
    known.push({
      ...input,
      id: `pending-${accepted.length}`,
      order: input.order ?? existing.length + accepted.length - 1,
    });
  }

  if (!accepted.length) {
    return [];
  }

  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const withExt = accepted.map((input, index) =>
      toItineraryInsertPayload(input, input.order ?? existing.length + index, true),
    );
    const { data, error } = await supabase.from('itinerary_items').insert(withExt).select('*');
    if (!error && data) {
      return (data as ItineraryRow[]).map(mapItem);
    }

    const legacy = accepted.map((input, index) =>
      toItineraryInsertPayload(input, input.order ?? existing.length + index, false),
    );
    const { data: legacyData, error: legacyError } = await supabase
      .from('itinerary_items')
      .insert(legacy)
      .select('*');
    if (legacyError) {
      throw error ?? legacyError;
    }
    return (legacyData as ItineraryRow[]).map(mapItem);
  }

  const items = await dbGet<ItineraryItem[]>(KEY, []);
  const created = accepted.map((input, index) => ({
    ...input,
    id: createId('itin'),
    order: input.order ?? existing.length + index,
  }));
  await dbSet(KEY, [...items, ...created]);
  return created;
}

export async function addItineraryItem(
  input: AddItineraryItemInput,
): Promise<ItineraryItem> {
  const existing = await listItinerary(input.tripId, input.day);
  assertNoTimeOverlap({
    existing,
    startTime: input.startTime,
    endTime: input.endTime,
  });

  if (useCloudStorage() && isUuid(input.tripId) && supabase) {
    const payload = toItineraryInsertPayload(input, input.order ?? existing.length, true);
    const { data, error } = await supabase.from('itinerary_items').insert(payload).select('*').single();
    if (error) {
      // Retry without extension columns if migration not applied.
      const { data: legacy, error: legacyError } = await supabase
        .from('itinerary_items')
        .insert(toItineraryInsertPayload(input, input.order ?? existing.length, false))
        .select('*')
        .single();
      if (legacyError) {
        throw error;
      }
      return mapItem(legacy as ItineraryRow);
    }
    return mapItem(data as ItineraryRow);
  }

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
  if (useCloudStorage() && isUuid(id) && supabase) {
    const { data: currentRow, error: loadError } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (loadError) {
      throw loadError;
    }
    if (!currentRow) {
      throw new Error('Itinerary item not found');
    }
    const current = mapItem(currentRow as ItineraryRow);
    const nextStart = patch.startTime ?? current.startTime;
    const nextEnd = patch.endTime ?? current.endTime;
    const nextDay = patch.day ?? current.day;
    if (patch.startTime != null || patch.endTime != null || patch.day != null) {
      const existing = await listItinerary(current.tripId, nextDay);
      assertNoTimeOverlap({
        existing,
        startTime: nextStart,
        endTime: nextEnd,
        excludeId: id,
      });
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.startTime != null) payload.start_time = patch.startTime;
    if (patch.endTime != null) payload.end_time = patch.endTime;
    if (patch.title != null) payload.title = patch.title;
    if (patch.placeId != null) payload.place_id = patch.placeId;
    if (patch.placeName != null) payload.place_name = patch.placeName;
    if (patch.latitude != null) payload.latitude = patch.latitude;
    if (patch.longitude != null) payload.longitude = patch.longitude;
    if (patch.estimatedCost != null) payload.estimated_cost = patch.estimatedCost;
    if (patch.currency != null) payload.currency = patch.currency;
    if (patch.notes != null) payload.notes = patch.notes;
    if (patch.transportSummary != null) payload.transport_summary = patch.transportSummary;
    if (patch.order != null) payload.sort_order = patch.order;
    if (patch.day != null) payload.day = patch.day;

    const { data, error } = await supabase
      .from('itinerary_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return mapItem(data as ItineraryRow);
  }

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
  if (patch.startTime != null || patch.endTime != null || patch.day != null) {
    const sameDay = items.filter(
      (item) => item.tripId === next.tripId && item.day === next.day && item.id !== id,
    );
    assertNoTimeOverlap({
      existing: sameDay,
      startTime: next.startTime,
      endTime: next.endTime,
      excludeId: id,
    });
  }
  items[index] = next;
  await dbSet(KEY, items);
  return next;
}

export async function removeItineraryItem(id: string): Promise<void> {
  if (useCloudStorage() && isUuid(id) && supabase) {
    const { error } = await supabase.from('itinerary_items').delete().eq('id', id);
    if (error) {
      throw error;
    }
    return;
  }

  const items = await dbGet<ItineraryItem[]>(KEY, []);
  await dbSet(
    KEY,
    items.filter((item) => item.id !== id),
  );
}

export async function reorderItinerary(tripId: string, day: string, orderedIds: string[]) {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const client = supabase;
    await Promise.all(
      orderedIds.map((id, order) =>
        client.from('itinerary_items').update({ sort_order: order }).eq('id', id),
      ),
    );
    return;
  }

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

export async function addPlaceToTrip(input: {
  tripId: string;
  place: Place;
  day?: string;
  startTime?: string;
  endTime?: string;
  currency?: string;
}): Promise<ItineraryItem> {
  const day = input.day ?? toIsoDate();
  const existing = await listItinerary(input.tripId, day);

  let startTime = input.startTime;
  let endTime = input.endTime;

  if (!startTime || !endTime) {
    const slot = findFlexibleFreeSlot(existing, 120);
    if (!slot) {
      throw new Error('No free time left on this day. Remove a stop or pick another day.');
    }
    startTime = startTime ?? slot.startTime;
    endTime = endTime ?? slot.endTime;
  }

  // Explicit times still go through overlap check inside addItineraryItem.
  return addItineraryItem({
    tripId: input.tripId,
    day,
    startTime,
    endTime,
    title: input.place.name,
    placeId: input.place.id,
    placeName: input.place.name,
    latitude: input.place.latitude,
    longitude: input.place.longitude,
    currency: input.currency,
    notes: [
      input.place.address,
      input.place.openingHours?.length ? `Hours: ${input.place.openingHours.join(', ')}` : null,
      input.place.cuisine ? `Cuisine: ${input.place.cuisine}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
