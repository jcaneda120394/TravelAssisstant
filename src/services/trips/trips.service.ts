import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import type { Trip, TripMember } from '@/types/domain';

const TRIPS_KEY = 'trips';
const MEMBERS_KEY = 'trip_members';

export async function listTrips(userId: string): Promise<Trip[]> {
  const trips = await dbGet<Trip[]>(TRIPS_KEY, []);
  return trips
    .filter((trip) => trip.ownerId === userId || trip.memberIds.includes(userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getTrip(tripId: string): Promise<Trip | null> {
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
  const members = await dbGet<TripMember[]>(MEMBERS_KEY, []);
  return members.filter((member) => member.tripId === tripId);
}
