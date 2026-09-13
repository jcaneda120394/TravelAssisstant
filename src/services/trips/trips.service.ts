import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import { inviteEmailSchema } from '@/lib/validation/security-schemas';
import type {
  Trip,
  TripBudgetLevel,
  TripMember,
  TripPace,
  TripPlanningMode,
  TripSource,
  TripStatus,
  TripTravelerProfile,
} from '@/types/domain';

const TRIPS_KEY = 'trips';
const MEMBERS_KEY = 'trip_members';

type TripRow = {
  id: string;
  owner_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  destinations: string[];
  adults: number;
  children: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  status?: string | null;
  source?: string | null;
  open_ended?: boolean | null;
  pace?: string | null;
  travel_style?: string | null;
  budget_level?: string | null;
  interests?: string[] | null;
  transport_preferences?: string[] | null;
  walking_tolerance?: string | null;
  planning_mode?: string | null;
  traveler_profile?: TripTravelerProfile | Record<string, unknown> | null;
  home_currency?: string | null;
  is_public?: boolean | null;
  public_summary?: string | null;
};

type MemberRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked';
  invite_token?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
};

function mapMember(row: MemberRow): TripMember {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id ?? '',
    email: row.email,
    role: row.role,
    status: row.status,
    inviteToken: row.invite_token ?? null,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
  };
}

export type CreateTripInput = {
  ownerId: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  openEnded?: boolean;
  destinations: string[];
  adults: number;
  children: number;
  notes?: string;
  description?: string;
  status?: TripStatus;
  source?: TripSource;
  pace?: TripPace;
  travelStyle?: string;
  budgetLevel?: TripBudgetLevel;
  interests?: string[];
  transportPreferences?: string[];
  walkingTolerance?: 'low' | 'medium' | 'high';
  planningMode?: TripPlanningMode;
  travelerProfile?: TripTravelerProfile;
  homeCurrency?: string;
};

function normalizeTrip(trip: Trip): Trip {
  return {
    ...trip,
    endDate: trip.endDate ?? null,
    openEnded: trip.openEnded ?? !trip.endDate,
    status: trip.status ?? 'planned',
    source: trip.source ?? 'manual',
    interests: trip.interests ?? [],
    transportPreferences: trip.transportPreferences ?? [],
    isPublic: trip.isPublic ?? false,
  };
}

export function mapTrip(row: TripRow, memberIds: string[] = []): Trip {
  const travelerProfile =
    row.traveler_profile && typeof row.traveler_profile === 'object'
      ? (row.traveler_profile as TripTravelerProfile)
      : undefined;
  return normalizeTrip({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    openEnded: Boolean(row.open_ended) || row.end_date == null,
    status: (row.status as TripStatus) || 'planned',
    source: (row.source as TripSource) || 'manual',
    destinations: row.destinations ?? [],
    adults: row.adults,
    children: row.children,
    travelerProfile,
    pace: (row.pace as TripPace) || undefined,
    travelStyle: row.travel_style ?? undefined,
    budgetLevel: (row.budget_level as TripBudgetLevel) || undefined,
    interests: row.interests ?? [],
    transportPreferences: row.transport_preferences ?? [],
    walkingTolerance: (row.walking_tolerance as Trip['walkingTolerance']) || undefined,
    planningMode: (row.planning_mode as TripPlanningMode) || undefined,
    homeCurrency: row.home_currency ?? undefined,
    notes: row.notes ?? undefined,
    isPublic: Boolean(row.is_public),
    publicSummary: row.public_summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberIds: memberIds.length ? memberIds : [row.owner_id],
  });
}

function buildInsertPayload(input: CreateTripInput) {
  const openEnded = Boolean(input.openEnded) || input.endDate == null;
  const travelerProfile: TripTravelerProfile = input.travelerProfile ?? {
    adults: input.adults,
    children: input.children,
    travelStyle: input.travelStyle,
    pace: input.pace,
    budgetLevel: input.budgetLevel,
    interests: input.interests,
    transportPreferences: input.transportPreferences,
    walkingTolerance: input.walkingTolerance,
  };

  return {
    owner_id: input.ownerId,
    title: input.title,
    start_date: input.startDate,
    end_date: openEnded ? null : input.endDate,
    destinations: input.destinations,
    adults: input.adults,
    children: input.children,
    notes: input.notes ?? input.description ?? null,
    status: input.status ?? (input.planningMode === 'manual' ? 'draft' : 'planned'),
    source: input.source ?? 'manual',
    open_ended: openEnded,
    pace: input.pace ?? null,
    travel_style: input.travelStyle ?? null,
    budget_level: input.budgetLevel ?? null,
    interests: input.interests ?? [],
    transport_preferences: input.transportPreferences ?? [],
    walking_tolerance: input.walkingTolerance ?? null,
    planning_mode: input.planningMode ?? null,
    traveler_profile: travelerProfile,
    home_currency: input.homeCurrency ?? 'USD',
  };
}

function buildLocalTrip(input: CreateTripInput): Trip {
  const now = new Date().toISOString();
  const openEnded = Boolean(input.openEnded) || input.endDate == null;
  const travelerProfile: TripTravelerProfile = input.travelerProfile ?? {
    adults: input.adults,
    children: input.children,
    travelStyle: input.travelStyle,
    pace: input.pace,
    budgetLevel: input.budgetLevel,
    interests: input.interests,
    transportPreferences: input.transportPreferences,
    walkingTolerance: input.walkingTolerance,
  };

  return normalizeTrip({
    id: createId('trip'),
    ownerId: input.ownerId,
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: openEnded ? null : (input.endDate ?? null),
    openEnded,
    status: input.status ?? (input.planningMode === 'manual' ? 'draft' : 'planned'),
    source: input.source ?? 'manual',
    destinations: input.destinations,
    adults: input.adults,
    children: input.children,
    travelerProfile,
    pace: input.pace,
    travelStyle: input.travelStyle,
    budgetLevel: input.budgetLevel,
    interests: input.interests ?? [],
    transportPreferences: input.transportPreferences ?? [],
    walkingTolerance: input.walkingTolerance,
    planningMode: input.planningMode,
    homeCurrency: input.homeCurrency ?? 'USD',
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
    memberIds: [input.ownerId],
  });
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
    .map(normalizeTrip)
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
  const found = trips.find((trip) => trip.id === tripId);
  return found ? normalizeTrip(found) : null;
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  if (useCloudStorage(input.ownerId) && supabase) {
    const payload = buildInsertPayload(input);
    const { data, error } = await supabase.from('trips').insert(payload).select('*').single();
    if (error) {
      // Fallback when migration columns are not applied yet.
      const { data: legacy, error: legacyError } = await supabase
        .from('trips')
        .insert({
          owner_id: input.ownerId,
          title: input.title,
          start_date: input.startDate,
          end_date: input.endDate ?? input.startDate,
          destinations: input.destinations,
          adults: input.adults,
          children: input.children,
          notes: input.notes ?? null,
        })
        .select('*')
        .single();
      if (legacyError) {
        throw error;
      }
      const trip = mapTrip(legacy as TripRow);
      await supabase.from('trip_members').insert({
        trip_id: trip.id,
        user_id: input.ownerId,
        email: 'owner',
        role: 'owner',
        status: 'accepted',
      });
      return trip;
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

  const trip = buildLocalTrip(input);
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
    if (patch.endDate !== undefined) payload.end_date = patch.endDate;
    if (patch.openEnded != null) payload.open_ended = patch.openEnded;
    if (patch.destinations != null) payload.destinations = patch.destinations;
    if (patch.adults != null) payload.adults = patch.adults;
    if (patch.children != null) payload.children = patch.children;
    if (patch.notes != null) payload.notes = patch.notes;
    if (patch.status != null) payload.status = patch.status;
    if (patch.source != null) payload.source = patch.source;
    if (patch.pace != null) payload.pace = patch.pace;
    if (patch.travelStyle != null) payload.travel_style = patch.travelStyle;
    if (patch.budgetLevel != null) payload.budget_level = patch.budgetLevel;
    if (patch.interests != null) payload.interests = patch.interests;
    if (patch.transportPreferences != null) payload.transport_preferences = patch.transportPreferences;
    if (patch.walkingTolerance != null) payload.walking_tolerance = patch.walkingTolerance;
    if (patch.planningMode != null) payload.planning_mode = patch.planningMode;
    if (patch.travelerProfile != null) payload.traveler_profile = patch.travelerProfile;
    if (patch.homeCurrency != null) payload.home_currency = patch.homeCurrency;
    if (patch.isPublic != null) payload.is_public = patch.isPublic;
    if (patch.publicSummary !== undefined) payload.public_summary = patch.publicSummary ?? null;

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
  const next = normalizeTrip({ ...current, ...patch, updatedAt: new Date().toISOString() });
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
  const email = inviteEmailSchema.parse(input.email.trim().toLowerCase());
  if (useCloudStorage(input.invitedByUserId) && isUuid(input.tripId) && supabase) {
    const { data, error } = await supabase
      .from('trip_members')
      .insert({
        trip_id: input.tripId,
        email,
        role: input.role,
        status: 'pending',
      })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const row = data as MemberRow;
    return mapMember(row);
  }

  const member: TripMember = {
    id: createId('member'),
    tripId: input.tripId,
    userId: createId('invitee'),
    email,
    role: input.role,
    status: 'pending',
    inviteToken: `local_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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

export async function acceptTripInvite(token: string): Promise<TripMember> {
  const cleaned = token.trim();
  if (cleaned.length < 32) {
    throw new Error('Invalid invite token');
  }

  if (useCloudStorage() && supabase) {
    const { data, error } = await supabase.rpc('accept_trip_invite', { p_token: cleaned });
    if (error) {
      throw error;
    }
    return mapMember(data as MemberRow);
  }

  const members = await dbGet<TripMember[]>(MEMBERS_KEY, []);
  const index = members.findIndex((m) => m.inviteToken === cleaned && m.status === 'pending');
  if (index < 0) {
    throw new Error('Invite not found');
  }
  const current = members[index]!;
  if (current.expiresAt && new Date(current.expiresAt).getTime() < Date.now()) {
    throw new Error('Invite expired');
  }
  const next: TripMember = {
    ...current,
    status: 'accepted',
    inviteToken: null,
  };
  members[index] = next;
  await dbSet(MEMBERS_KEY, members);
  return next;
}

export async function revokeTripInvite(memberId: string): Promise<TripMember> {
  if (useCloudStorage() && isUuid(memberId) && supabase) {
    const { data, error } = await supabase.rpc('revoke_trip_invite', { p_member_id: memberId });
    if (error) {
      throw error;
    }
    return mapMember(data as MemberRow);
  }

  const members = await dbGet<TripMember[]>(MEMBERS_KEY, []);
  const index = members.findIndex((m) => m.id === memberId);
  if (index < 0) {
    throw new Error('Invite not found');
  }
  const next: TripMember = {
    ...members[index]!,
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    inviteToken: null,
  };
  members[index] = next;
  await dbSet(MEMBERS_KEY, members);
  return next;
}

export async function listTripMembers(tripId: string): Promise<TripMember[]> {
  if (useCloudStorage() && isUuid(tripId) && supabase) {
    const { data, error } = await supabase
      .from('trip_members')
      .select('id, trip_id, user_id, email, role, status, invite_token, expires_at, revoked_at')
      .eq('trip_id', tripId)
      .neq('status', 'revoked');
    if (error) {
      throw error;
    }
    return (data as MemberRow[]).map(mapMember);
  }

  const members = await dbGet<TripMember[]>(MEMBERS_KEY, []);
  return members.filter((member) => member.tripId === tripId && member.status !== 'revoked');
}
