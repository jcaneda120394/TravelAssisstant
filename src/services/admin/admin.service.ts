import { env } from '@/config/env';
import { AppError, toAppError } from '@/lib/errors/app-error';
import { assertSupabase } from '@/lib/supabase/client';
import type { UserPreferences } from '@/types/auth';
import { userPreferencesSchema } from '@/types/auth';

export type AdminOverview = {
  users: number;
  admins: number;
  trips: number;
  publicTrips: number;
  reviews: number;
  publicReviews: number;
  photos: number;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'user' | 'admin';
  is_disabled: boolean;
  onboarding_completed: boolean;
  created_at: string;
};

export type AdminUserDetail = {
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    bio: string | null;
    admin_notes: string | null;
    role: 'user' | 'admin';
    is_disabled: boolean;
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
  };
  preferences: UserPreferences | null;
};

export type AdminProfileUpdate = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  admin_notes: string | null;
  onboarding_completed: boolean;
  role: 'user' | 'admin';
  is_disabled: boolean;
};

export type AdminPreferencesUpdate = {
  home_country: string | null;
  home_currency: string;
  preferred_language: string;
  budget_tier: UserPreferences['budget_tier'];
  adults: number;
  children: number;
  distance_unit: UserPreferences['distance_unit'];
  temperature_unit: UserPreferences['temperature_unit'];
  time_format: UserPreferences['time_format'];
  walking_tolerance: UserPreferences['walking_tolerance'];
};

export type AdminSpotRow = {
  id: string;
  kind: 'review' | 'photo';
  place_name: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  preview: string;
};

export type AdminTripRow = {
  id: string;
  title: string;
  owner_id: string;
  owner_email: string | null;
  owner_name: string | null;
  is_public: boolean;
  status: string | null;
  start_date: string;
  end_date: string | null;
  destinations: string[];
  adults: number;
  children: number;
  created_at: string;
  updated_at: string;
};

function requireLive() {
  if (!env.isSupabaseConfigured) {
    throw new AppError('Admin dashboard requires a connected Supabase project.', {
      code: 'ADMIN_SUPABASE_REQUIRED',
    });
  }
  return assertSupabase();
}

function mapPreferences(row: unknown): UserPreferences | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const data = row as Record<string, unknown>;
  return userPreferencesSchema.parse({
    ...data,
    traveling_with_kids: data.traveling_with_kids ?? false,
    kids_ages: data.kids_ages ?? [],
    traveling_with_elderly: data.traveling_with_elderly ?? false,
    elderly_ages: data.elderly_ages ?? [],
  });
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const client = requireLive();
  const [users, admins, trips, publicTrips, reviews, publicReviews, photos] = await Promise.all([
    client.from('profiles').select('id', { count: 'exact', head: true }),
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    client.from('trips').select('id', { count: 'exact', head: true }),
    client.from('trips').select('id', { count: 'exact', head: true }).eq('is_public', true),
    client.from('place_reviews').select('id', { count: 'exact', head: true }),
    client.from('place_reviews').select('id', { count: 'exact', head: true }).eq('is_public', true),
    client.from('place_photos').select('id', { count: 'exact', head: true }),
  ]);

  for (const result of [users, admins, trips, publicTrips, reviews, publicReviews, photos]) {
    if (result.error) {
      throw toAppError(result.error, 'Failed to load admin overview');
    }
  }

  return {
    users: users.count ?? 0,
    admins: admins.count ?? 0,
    trips: trips.count ?? 0,
    publicTrips: publicTrips.count ?? 0,
    reviews: reviews.count ?? 0,
    publicReviews: publicReviews.count ?? 0,
    photos: photos.count ?? 0,
  };
}

export async function listAdminUsers(query = ''): Promise<AdminUserRow[]> {
  const client = requireLive();
  let request = client
    .from('profiles')
    .select('id, email, full_name, role, is_disabled, onboarding_completed, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const q = query.trim();
  if (q) {
    request = request.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data, error } = await request;
  if (error) {
    throw toAppError(error, 'Failed to load users');
  }
  return (data ?? []) as AdminUserRow[];
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const client = requireLive();
  const [profileResult, prefsResult] = await Promise.all([
    client
      .from('profiles')
      .select(
        'id, email, full_name, avatar_url, phone, bio, admin_notes, role, is_disabled, onboarding_completed, created_at, updated_at',
      )
      .eq('id', userId)
      .maybeSingle(),
    client.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (profileResult.error) {
    throw toAppError(profileResult.error, 'Failed to load user profile');
  }
  if (!profileResult.data) {
    throw new AppError('User not found', { code: 'ADMIN_USER_NOT_FOUND' });
  }
  if (prefsResult.error) {
    throw toAppError(prefsResult.error, 'Failed to load user preferences');
  }

  const row = profileResult.data;
  return {
    profile: {
      id: row.id as string,
      email: (row.email as string | null) ?? null,
      full_name: (row.full_name as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      admin_notes: (row.admin_notes as string | null) ?? null,
      role: row.role === 'admin' ? 'admin' : 'user',
      is_disabled: Boolean(row.is_disabled),
      onboarding_completed: Boolean(row.onboarding_completed),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    },
    preferences: mapPreferences(prefsResult.data),
  };
}

export async function updateAdminUserProfile(
  userId: string,
  patch: AdminProfileUpdate,
): Promise<void> {
  const client = requireLive();
  const { error } = await client
    .from('profiles')
    .update({
      full_name: patch.full_name,
      email: patch.email,
      avatar_url: patch.avatar_url,
      phone: patch.phone,
      bio: patch.bio,
      admin_notes: patch.admin_notes,
      onboarding_completed: patch.onboarding_completed,
      role: patch.role,
      is_disabled: patch.is_disabled,
    })
    .eq('id', userId);

  if (error) {
    throw toAppError(error, 'Failed to update profile');
  }
}

export async function updateAdminUserPreferences(
  userId: string,
  patch: AdminPreferencesUpdate,
): Promise<void> {
  const client = requireLive();
  const { error } = await client.from('user_preferences').upsert(
    {
      user_id: userId,
      home_country: patch.home_country,
      home_currency: patch.home_currency,
      preferred_language: patch.preferred_language,
      budget_tier: patch.budget_tier,
      adults: patch.adults,
      children: patch.children,
      distance_unit: patch.distance_unit,
      temperature_unit: patch.temperature_unit,
      time_format: patch.time_format,
      walking_tolerance: patch.walking_tolerance,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw toAppError(error, 'Failed to update preferences');
  }
}

/** Updates Auth password / email / metadata via Edge Function (service role). */
export async function updateAdminUserAuth(params: {
  userId: string;
  password?: string;
  email?: string;
  fullName?: string;
}): Promise<void> {
  const client = requireLive();
  const { data, error } = await client.functions.invoke<{ error?: string; ok?: boolean }>(
    'admin-update-user',
    {
      body: {
        userId: params.userId,
        password: params.password,
        email: params.email,
        fullName: params.fullName,
      },
    },
  );

  if (error) {
    throw toAppError(error, 'Failed to update auth credentials');
  }
  if (data?.error) {
    throw new AppError(data.error, { code: 'ADMIN_AUTH_UPDATE_FAILED' });
  }
}

export async function setAdminUserRole(
  userId: string,
  role: 'user' | 'admin',
): Promise<void> {
  const client = requireLive();
  const { error } = await client.from('profiles').update({ role }).eq('id', userId);
  if (error) {
    throw toAppError(error, 'Failed to update role');
  }
}

export async function setAdminUserDisabled(userId: string, disabled: boolean): Promise<void> {
  const client = requireLive();
  const { error } = await client
    .from('profiles')
    .update({ is_disabled: disabled })
    .eq('id', userId);
  if (error) {
    throw toAppError(error, 'Failed to update user status');
  }
}

export async function listAdminTrips(query = ''): Promise<AdminTripRow[]> {
  const client = requireLive();
  let request = client
    .from('trips')
    .select(
      'id, title, owner_id, is_public, status, start_date, end_date, destinations, adults, children, created_at, updated_at, profiles!trips_owner_id_fkey(email, full_name)',
    )
    .order('updated_at', { ascending: false })
    .limit(150);

  const q = query.trim();
  if (q) {
    request = request.or(`title.ilike.%${q}%,destinations.cs.{${q}}`);
  }

  const { data, error } = await request;
  if (error) {
    // Fallback without FK embed if relationship name differs.
    const fallback = await client
      .from('trips')
      .select(
        'id, title, owner_id, is_public, status, start_date, end_date, destinations, adults, children, created_at, updated_at',
      )
      .order('updated_at', { ascending: false })
      .limit(150);
    if (fallback.error) {
      throw toAppError(fallback.error, 'Failed to load trips');
    }

    const ownerIds = Array.from(
      new Set((fallback.data ?? []).map((row) => row.owner_id as string).filter(Boolean)),
    );
    const owners =
      ownerIds.length === 0
        ? []
        : (
            await client
              .from('profiles')
              .select('id, email, full_name')
              .in('id', ownerIds)
          ).data ?? [];
    const ownerMap = new Map(
      owners.map((owner) => [
        owner.id as string,
        { email: (owner.email as string | null) ?? null, name: (owner.full_name as string | null) ?? null },
      ]),
    );

    return (fallback.data ?? [])
      .filter((row) => {
        if (!q) return true;
        const owner = ownerMap.get(row.owner_id as string);
        const hay = `${row.title} ${owner?.email ?? ''} ${owner?.name ?? ''} ${(row.destinations as string[] | null)?.join(' ') ?? ''}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .map((row) => {
        const owner = ownerMap.get(row.owner_id as string);
        return {
          id: row.id as string,
          title: row.title as string,
          owner_id: row.owner_id as string,
          owner_email: owner?.email ?? null,
          owner_name: owner?.name ?? null,
          is_public: Boolean(row.is_public),
          status: (row.status as string | null) ?? null,
          start_date: row.start_date as string,
          end_date: (row.end_date as string | null) ?? null,
          destinations: (row.destinations as string[] | null) ?? [],
          adults: Number(row.adults ?? 1),
          children: Number(row.children ?? 0),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
        } satisfies AdminTripRow;
      });
  }

  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { email?: string | null; full_name?: string | null }
      | { email?: string | null; full_name?: string | null }[]
      | null;
    const owner = Array.isArray(profile) ? profile[0] : profile;
    return {
      id: row.id as string,
      title: row.title as string,
      owner_id: row.owner_id as string,
      owner_email: owner?.email ?? null,
      owner_name: owner?.full_name ?? null,
      is_public: Boolean(row.is_public),
      status: (row.status as string | null) ?? null,
      start_date: row.start_date as string,
      end_date: (row.end_date as string | null) ?? null,
      destinations: (row.destinations as string[] | null) ?? [],
      adults: Number(row.adults ?? 1),
      children: Number(row.children ?? 0),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    } satisfies AdminTripRow;
  });
}

export async function setAdminTripPublic(tripId: string, isPublic: boolean): Promise<void> {
  const client = requireLive();
  const { error } = await client.from('trips').update({ is_public: isPublic }).eq('id', tripId);
  if (error) {
    throw toAppError(error, 'Failed to update trip visibility');
  }
}

export async function deleteAdminTrip(tripId: string): Promise<void> {
  const client = requireLive();
  const { error } = await client.from('trips').delete().eq('id', tripId);
  if (error) {
    throw toAppError(error, 'Failed to delete trip');
  }
}

export async function listAdminSpots(): Promise<AdminSpotRow[]> {
  const client = requireLive();
  const [reviews, photos] = await Promise.all([
    client
      .from('place_reviews')
      .select('id, place_name, user_id, is_public, created_at, body, rating')
      .order('created_at', { ascending: false })
      .limit(50),
    client
      .from('place_photos')
      .select('id, place_name, user_id, is_public, created_at, caption')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (reviews.error) {
    throw toAppError(reviews.error, 'Failed to load reviews');
  }
  if (photos.error) {
    throw toAppError(photos.error, 'Failed to load photos');
  }

  const reviewRows: AdminSpotRow[] = (reviews.data ?? []).map((row) => ({
    id: row.id as string,
    kind: 'review',
    place_name: (row.place_name as string) ?? 'Place',
    user_id: row.user_id as string,
    is_public: Boolean(row.is_public),
    created_at: row.created_at as string,
    preview: `★ ${row.rating} · ${String(row.body ?? '').slice(0, 120)}`,
  }));

  const photoRows: AdminSpotRow[] = (photos.data ?? []).map((row) => ({
    id: row.id as string,
    kind: 'photo',
    place_name: (row.place_name as string) ?? 'Place',
    user_id: row.user_id as string,
    is_public: Boolean(row.is_public),
    created_at: row.created_at as string,
    preview: String(row.caption ?? 'Photo').slice(0, 120),
  }));

  return [...reviewRows, ...photoRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function setAdminSpotPublic(
  kind: 'review' | 'photo',
  id: string,
  isPublic: boolean,
): Promise<void> {
  const client = requireLive();
  const table = kind === 'review' ? 'place_reviews' : 'place_photos';
  const { error } = await client.from(table).update({ is_public: isPublic }).eq('id', id);
  if (error) {
    throw toAppError(error, 'Failed to update visibility');
  }
}

export async function deleteAdminSpot(kind: 'review' | 'photo', id: string): Promise<void> {
  const client = requireLive();
  const table = kind === 'review' ? 'place_reviews' : 'place_photos';
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) {
    throw toAppError(error, 'Failed to delete content');
  }
}
