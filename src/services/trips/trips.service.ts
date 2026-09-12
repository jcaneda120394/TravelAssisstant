import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import type { Trip, TripMember } from '@/types/domain';

const TRIPS_KEY = 'trips';
const MEMBERS_KEY = 'trip_members';

type TripRow = {
  id: string;
  owner_id: string;
  title: string;
  start_date: string;
  end_date: string;
  destinations: string[];
  adults: number;
  children: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted';
};

function mapTrip(row: TripRow, memberIds: string[] = []): Trip {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    destinations: row.destinations ?? [],
    adults: row.adults,
    children: row.children,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberIds: memberIds.length ? memberIds : [row.owner_id],
  };
}

export async function listTrips(userId: string): Promise<Trip[]> {
  if (useCloudStorage(userId) && supabase) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });
    if (error) {
      throw error;
    }
    return (data as TripRow[]).map((row) => mapTrip(row));
  }

  const trips = await dbGet<Trip[]>(TRIPS_KEY, []);
  return trips
    .filter((trip) => trip.ownerId === userId || trip.memberIds.includes(userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
    if (error) {
      throw error;
    }
    return data ? mapTrip(data as TripRow) : null;
  }

  const trips = await dbGet<Trip[]>(TRIPS_KEY, []);
  return trips.find((trip) => trip.id === tripId) ?? null;
}

export async function createTrip(input: {
  ownerId: string;
  title: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  adults: number;
  children: number;
  notes?: string;
}): Promise<Trip> {
  if (useCloudStorage(input.ownerId) && supabase) {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        owner_id: input.ownerId,
        title: input.title,
        start_date: input.startDate,
        end_date: input.endDate,
        destinations: input.destinations,
        adults: input.adults,
        children: input.children,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const trip = mapTrip(data as TripRow);
    await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: input.ownerId,
      email: 'owner',
      role: 'owner',
      status: 'accepted',
    });
    return trip;
  }

  const now = new Date().toISOString();
  const trip: Trip = {
    id: createId('trip'),
    ownerId: input.ownerId,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    destinations: input.destinations,
    adults: input.adults,
    children: input.children,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
    memberIds: [input.ownerId],
  };

  const trips = await dbGet<Trip[]>(TRIPS_KEY, []);
  await dbSet(TRIPS_KEY, [trip, ...trips]);

  const members = await dbGet<TripMember[]>(MEMBERS_KEY, []);
  members.push({
    id: createId('member'),
    tripId: trip.id,
    userId: input.ownerId,
    email: 'owner@local',
    role: 'owner',
    status: 'accepted',
  });
  await dbSet(MEMBERS_KEY, members);

  return trip;
}

export async function updateTrip(tripId: string, patch: Partial<Trip>): Promise<Trip> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title != null) payload.title = patch.title;
    if (patch.startDate != null) payload.start_date = patch.startDate;
    if (patch.endDate != null) payload.end_date = patch.endDate;
    if (patch.destinations != null) payload.destinations = patch.destinations;
    if (patch.adults != null) payload.adults = patch.adults;
    if (patch.children != null) payload.children = patch.children;
    if (patch.notes != null) payload.notes = patch.notes;

    const { data, error } = await supabase
      .from('trips')
      .update(payload)
      .eq('id', tripId)
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return mapTrip(data as TripRow);
  }

  const trips = await dbGet<Trip[]>(TRIPS_KEY, []);
  const index = trips.findIndex((trip) => trip.id === tripId);
  if (index < 0) {
    throw new Error('Trip not found');
  }
  const current = trips[index];
  if (!current) {
    throw new Error('Trip not found');
  }
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  trips[index] = next;
  await dbSet(TRIPS_KEY, trips);
  return next;
}

export async function deleteTrip(tripId: string): Promise<void> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) {
      throw error;
    }
    return;
  }

  const trips = await dbGet<Trip[]>(TRIPS_KEY, []);
  await dbSet(
    TRIPS_KEY,
    trips.filter((trip) => trip.id !== tripId),
  );
}

export async function inviteTripMember(input: {
  tripId: string;
  email: string;
  role: 'editor' | 'viewer';
  invitedByUserId: string;
}): Promise<TripMember> {
  if (useCloudStorage(input.invitedByUserId) && isUuid(input.tripId) && supabase) {
    const { data, error } = await supabase
      .from('trip_members')
      .insert({
        trip_id: input.tripId,
        email: input.email,
        role: input.role,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const row = data as MemberRow;
    return {
      id: row.id,
      tripId: row.trip_id,
      userId: row.user_id ?? createId('invitee'),
      email: row.email,
      role: row.role,
      status: row.status,
    };
  }

  const member: TripMember = {
    id: createId('member'),
    tripId: input.tripId,
    userId: createId('invitee'),
    email: input.email,
    role: input.role,
    status: 'pending',
  };
  const members = await dbGet<TripMember[]>(MEMBERS_KEY, []);
  await dbSet(MEMBERS_KEY, [...members, member]);

  const trip = await getTrip(input.tripId);
  if (trip) {
    await updateTrip(input.tripId, {
      memberIds: [...new Set([...trip.memberIds, member.userId])],
    });
  }

  return member;
}

export async function listTripMembers(tripId: string): Promise<TripMember[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase.from('trip_members').select('*').eq('trip_id', tripId);
    if (error) {
      throw error;
    }
    return (data as MemberRow[]).map((row) => ({
      id: row.id,
      tripId: row.trip_id,
      userId: row.user_id ?? '',
      email: row.email,
      role: row.role,
      status: row.status,
    }));
  }

  const members = await dbGet<TripMember[]>(MEMBERS_KEY, []);
  return members.filter((member) => member.tripId === tripId);
}
