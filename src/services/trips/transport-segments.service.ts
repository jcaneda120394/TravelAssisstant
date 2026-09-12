import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import type { Route, TransportSegment, TransportSegmentStatus } from '@/types/domain';

const KEY = 'transport_segments';

type Row = {
  id: string;
  trip_id: string;
  day: string;
  from_item_id: string | null;
  to_item_id: string | null;
  status: string;
  summary: string | null;
  mode: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  estimated_cost: number | null;
  currency: string | null;
  provider: string | null;
  selected_route: Route | null;
  alternatives: Route[] | null;
  sort_order: number;
  fetched_at: string | null;
};

function mapRow(row: Row): TransportSegment {
  return {
    id: row.id,
    tripId: row.trip_id,
    day: row.day,
    fromItemId: row.from_item_id ?? undefined,
    toItemId: row.to_item_id ?? undefined,
    status: (row.status as TransportSegmentStatus) || 'live_data_required',
    summary: row.summary ?? undefined,
    mode: (row.mode as TransportSegment['mode']) || undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    distanceMeters: row.distance_meters ?? undefined,
    estimatedCost: row.estimated_cost ?? undefined,
    currency: row.currency ?? undefined,
    provider: row.provider ?? undefined,
    selectedRoute: row.selected_route ?? undefined,
    alternatives: row.alternatives ?? undefined,
    fetchedAt: row.fetched_at ?? undefined,
    order: row.sort_order,
  };
}

export async function listTransportSegments(
  tripId: string,
  day?: string,
): Promise<TransportSegment[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    let query = supabase.from('transport_segments').select('*').eq('trip_id', tripId);
    if (day) query = query.eq('day', day);
    const { data, error } = await query.order('sort_order', { ascending: true });
    if (error) return [];
    return (data as Row[]).map(mapRow);
  }
  const rows = await dbGet<TransportSegment[]>(KEY, []);
  return rows
    .filter((row) => row.tripId === tripId && (day ? row.day === day : true))
    .sort((a, b) => a.order - b.order);
}

export async function addTransportSegment(
  input: Omit<TransportSegment, 'id' | 'order'> & { order?: number },
): Promise<TransportSegment> {
  const existing = await listTransportSegments(input.tripId, input.day);

  if (useCloudStorage() && isUuid(input.tripId) && supabase) {
    const { data, error } = await supabase
      .from('transport_segments')
      .insert({
        trip_id: input.tripId,
        day: input.day,
        from_item_id: input.fromItemId && isUuid(input.fromItemId) ? input.fromItemId : null,
        to_item_id: input.toItemId && isUuid(input.toItemId) ? input.toItemId : null,
        status: input.status,
        summary: input.summary ?? null,
        mode: input.mode ?? null,
        duration_seconds: input.durationSeconds ?? null,
        distance_meters: input.distanceMeters ?? null,
        estimated_cost: input.estimatedCost ?? null,
        currency: input.currency ?? null,
        provider: input.provider ?? null,
        selected_route: input.selectedRoute ?? null,
        alternatives: input.alternatives ?? [],
        sort_order: input.order ?? existing.length,
        fetched_at: input.fetchedAt ?? null,
      })
      .select('*')
      .single();
    if (error) {
      // Fall through to local when cloud insert fails (e.g. non-uuid item ids).
    } else {
      return mapRow(data as Row);
    }
  }

  const item: TransportSegment = {
    ...input,
    id: createId('tseg'),
    order: input.order ?? existing.length,
  };
  const rows = await dbGet<TransportSegment[]>(KEY, []);
  await dbSet(KEY, [...rows, item]);
  return item;
}

export async function replaceTransportSegmentsForDay(
  tripId: string,
  day: string,
  segments: Array<Omit<TransportSegment, 'id' | 'tripId' | 'day' | 'order'> & { order?: number }>,
): Promise<TransportSegment[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    await supabase.from('transport_segments').delete().eq('trip_id', tripId).eq('day', day);
  } else {
    const rows = await dbGet<TransportSegment[]>(KEY, []);
    await dbSet(
      KEY,
      rows.filter((row) => !(row.tripId === tripId && row.day === day)),
    );
  }
  const created: TransportSegment[] = [];
  for (const [order, segment] of segments.entries()) {
    created.push(
      await addTransportSegment({
        ...segment,
        tripId,
        day,
        order: segment.order ?? order,
      }),
    );
  }
  return created;
}
