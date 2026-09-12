import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import type { ItineraryDayMeta } from '@/types/domain';

const KEY = 'itinerary_days';

type Row = {
  id: string;
  trip_id: string;
  day: string;
  day_number: number;
  title: string | null;
  city: string | null;
  country: string | null;
  summary: string | null;
};

function mapRow(row: Row): ItineraryDayMeta {
  return {
    id: row.id,
    tripId: row.trip_id,
    day: row.day,
    dayNumber: row.day_number,
    title: row.title ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    summary: row.summary ?? undefined,
  };
}

export async function listItineraryDays(tripId: string): Promise<ItineraryDayMeta[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day', { ascending: true });
    if (error) return [];
    return (data as Row[]).map(mapRow);
  }
  const rows = await dbGet<ItineraryDayMeta[]>(KEY, []);
  return rows.filter((row) => row.tripId === tripId).sort((a, b) => a.day.localeCompare(b.day));
}

export async function upsertItineraryDay(
  input: Omit<ItineraryDayMeta, 'id'> & { id?: string },
): Promise<ItineraryDayMeta> {
  if (useCloudStorage() && isUuid(input.tripId) && supabase) {
    const { data, error } = await supabase
      .from('itinerary_days')
      .upsert(
        {
          trip_id: input.tripId,
          day: input.day,
          day_number: input.dayNumber,
          title: input.title ?? null,
          city: input.city ?? null,
          country: input.country ?? null,
          summary: input.summary ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trip_id,day' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return mapRow(data as Row);
  }

  const rows = await dbGet<ItineraryDayMeta[]>(KEY, []);
  const index = rows.findIndex((row) => row.tripId === input.tripId && row.day === input.day);
  const next: ItineraryDayMeta = {
    id: input.id ?? (index >= 0 ? rows[index]!.id : createId('iday')),
    tripId: input.tripId,
    day: input.day,
    dayNumber: input.dayNumber,
    title: input.title,
    city: input.city,
    country: input.country,
    summary: input.summary,
  };
  if (index >= 0) {
    rows[index] = next;
  } else {
    rows.push(next);
  }
  await dbSet(KEY, rows);
  return next;
}
