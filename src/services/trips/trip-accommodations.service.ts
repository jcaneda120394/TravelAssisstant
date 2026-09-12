import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import type { TripAccommodation } from '@/types/domain';

const KEY = 'trip_accommodations';

type Row = {
  id: string;
  trip_id: string;
  name: string;
  address: string | null;
  city: string | null;
  check_in: string | null;
  check_out: string | null;
  reservation_number: string | null;
  notes: string | null;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  estimated_cost: number | null;
  currency: string | null;
  sort_order: number;
};

function mapRow(row: Row): TripAccommodation {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    checkIn: row.check_in ?? undefined,
    checkOut: row.check_out ?? undefined,
    reservationNumber: row.reservation_number ?? undefined,
    notes: row.notes ?? undefined,
    placeId: row.place_id ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    estimatedCost: row.estimated_cost ?? undefined,
    currency: row.currency ?? undefined,
    order: row.sort_order,
  };
}

export async function listTripAccommodations(tripId: string): Promise<TripAccommodation[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_order', { ascending: true });
    if (error) {
      // Table may not exist until migration is applied.
      return [];
    }
    return (data as Row[]).map(mapRow);
  }

  const rows = await dbGet<TripAccommodation[]>(KEY, []);
  return rows.filter((row) => row.tripId === tripId).sort((a, b) => a.order - b.order);
}

export async function addTripAccommodation(
  input: Omit<TripAccommodation, 'id' | 'order'> & { order?: number },
): Promise<TripAccommodation> {
  const existing = await listTripAccommodations(input.tripId);

  if (useCloudStorage() && isUuid(input.tripId) && supabase) {
    const { data, error } = await supabase
      .from('trip_accommodations')
      .insert({
        trip_id: input.tripId,
        name: input.name,
        address: input.address ?? null,
        city: input.city ?? null,
        check_in: input.checkIn ?? null,
        check_out: input.checkOut ?? null,
        reservation_number: input.reservationNumber ?? null,
        notes: input.notes ?? null,
        place_id: input.placeId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        estimated_cost: input.estimatedCost ?? null,
        currency: input.currency ?? null,
        sort_order: input.order ?? existing.length,
      })
      .select('*')
      .single();
    if (error) {
      // Fall through to local when cloud table missing.
    } else {
      return mapRow(data as Row);
    }
  }

  const item: TripAccommodation = {
    ...input,
    id: createId('stay'),
    order: input.order ?? existing.length,
  };
  const rows = await dbGet<TripAccommodation[]>(KEY, []);
  await dbSet(KEY, [...rows, item]);
  return item;
}
