import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import type { TripDestination } from '@/types/domain';

const KEY = 'trip_destinations';

type Row = {
  id: string;
  trip_id: string;
  label: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  sort_order: number;
  arrival_day: string | null;
  departure_day: string | null;
};

function mapRow(row: Row): TripDestination {
  return {
    id: row.id,
    tripId: row.trip_id,
    label: row.label,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    order: row.sort_order,
    arrivalDay: row.arrival_day ?? undefined,
    departureDay: row.departure_day ?? undefined,
  };
}

export async function listTripDestinations(tripId: string): Promise<TripDestination[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase
      .from('trip_destinations')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true });
    if (error) return [];
    return (data as Row[]).map(mapRow);
  }
  const rows = await dbGet<TripDestination[]>(KEY, []);
  return rows.filter((row) => row.tripId === tripId).sort((a, b) => a.order - b.order);
}

export async function replaceTripDestinations(
  tripId: string,
  destinations: Array<Omit<TripDestination, 'id' | 'tripId'> & { id?: string }>,
): Promise<TripDestination[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    await supabase.from('trip_destinations').delete().eq('trip_id', tripId);
    if (!destinations.length) return [];
    const { data, error } = await supabase
      .from('trip_destinations')
      .insert(
        destinations.map((dest, index) => ({
          trip_id: tripId,
          label: dest.label,
          city: dest.city ?? null,
          country: dest.country ?? null,
          latitude: dest.latitude ?? null,
          longitude: dest.longitude ?? null,
          sort_order: dest.order ?? index,
          arrival_day: dest.arrivalDay ?? null,
          departure_day: dest.departureDay ?? null,
        })),
      )
      .select('*');
    if (error) throw error;
    return (data as Row[]).map(mapRow);
  }

  const all = await dbGet<TripDestination[]>(KEY, []);
  const kept = all.filter((row) => row.tripId !== tripId);
  const next = destinations.map((dest, index) => ({
    id: dest.id ?? createId('tdest'),
    tripId,
    label: dest.label,
    city: dest.city,
    country: dest.country,
    latitude: dest.latitude,
    longitude: dest.longitude,
    order: dest.order ?? index,
    arrivalDay: dest.arrivalDay,
    departureDay: dest.departureDay,
  }));
  await dbSet(KEY, [...kept, ...next]);
  return next;
}
