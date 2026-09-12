import { env } from '@/config/env';
import { AppError, toAppError } from '@/lib/errors/app-error';
import { assertSupabase } from '@/lib/supabase/client';
import {
  getLocalPreferences,
  getLocalProfile,
  saveLocalPreferences,
  saveLocalProfile,
} from '@/services/auth/local-auth';
import type { OnboardingDraft, Profile, UserPreferences } from '@/types/auth';
import { userPreferencesSchema } from '@/types/auth';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!env.isSupabaseConfigured) {
    return getLocalProfile();
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Failed to load profile');
  }

  return data
    ? ({
        ...data,
        phone: data.phone ?? null,
        bio: data.bio ?? null,
        admin_notes: data.admin_notes ?? null,
        role: data.role === 'admin' ? 'admin' : 'user',
        is_disabled: Boolean(data.is_disabled),
      } as Profile)
    : null;
}

export async function ensureProfile(user: {
  id: string;
  email: string | null;
  fullName: string | null;
}): Promise<Profile> {
  const existing = await fetchProfile(user.id);
  if (existing) {
    return existing;
  }

  if (!env.isSupabaseConfigured) {
    const now = new Date().toISOString();
    return saveLocalProfile({
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      avatar_url: null,
      onboarding_completed: false,
      role: 'user',
      is_disabled: false,
      created_at: now,
      updated_at: now,
    });
  }

  const client = assertSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    throw new AppError(
      'Please confirm your email, then sign in. Profile setup needs an active session.',
      { code: 'AUTH_SESSION_REQUIRED' },
    );
  }

  // Trigger may create the row slightly after signup; retry once.
  await new Promise((resolve) => setTimeout(resolve, 400));
  const afterWait = await fetchProfile(user.id);
  if (afterWait) {
    return afterWait;
  }

  const upsertProfile = async () =>
    client
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
      })
      .select('*')
      .single();

  let { data, error } = await upsertProfile();

  // Brief clock-skew / eventual consistency retry for PGRST303.
  if (error && /PGRST303|issued at future/i.test(`${error.message} ${error.code}`)) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    ({ data, error } = await upsertProfile());
  }

  if (error) {
    throw toAppError(error, 'Failed to create profile');
  }

  // Ensure preferences row exists too (trigger may already have inserted it).
  await client.from('user_preferences').upsert({ user_id: user.id }, { onConflict: 'user_id' });

  return {
    ...data,
    role: data.role === 'admin' ? 'admin' : 'user',
    is_disabled: Boolean(data.is_disabled),
  } as Profile;
}

export async function fetchPreferences(userId: string): Promise<UserPreferences | null> {
  if (!env.isSupabaseConfigured) {
    const local = await getLocalPreferences();
    if (!local) return null;
    return userPreferencesSchema.parse({
      ...local,
      traveling_with_kids: local.traveling_with_kids ?? false,
      kids_ages: local.kids_ages ?? [],
      traveling_with_elderly: local.traveling_with_elderly ?? false,
      elderly_ages: local.elderly_ages ?? [],
    });
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw toAppError(error, 'Failed to load preferences');
  }

  if (!data) {
    return null;
  }

  return userPreferencesSchema.parse({
    ...data,
    traveling_with_kids: data.traveling_with_kids ?? false,
    kids_ages: data.kids_ages ?? [],
    traveling_with_elderly: data.traveling_with_elderly ?? false,
    elderly_ages: data.elderly_ages ?? [],
  });
}

export async function completeOnboarding(
  userId: string,
  draft: OnboardingDraft,
): Promise<{ profile: Profile; preferences: UserPreferences }> {
  const now = new Date().toISOString();

  const preferencesPayload: UserPreferences = {
    user_id: userId,
    travel_styles: draft.travel_styles,
    interests: draft.interests,
    budget_tier: draft.budget_tier,
    transport_preferences: draft.transport_preferences,
    home_country: draft.home_country,
    home_currency: draft.home_currency,
    preferred_language: draft.preferred_language,
    adults: draft.adults,
    children: draft.traveling_with_kids
      ? Math.max(draft.children, draft.kids_ages?.length || 1)
      : draft.children,
    traveling_with_kids: draft.traveling_with_kids ?? false,
    kids_ages: draft.traveling_with_kids ? draft.kids_ages ?? [] : [],
    traveling_with_elderly: draft.traveling_with_elderly ?? false,
    elderly_ages: draft.traveling_with_elderly ? draft.elderly_ages ?? [] : [],
    dietary_restrictions: draft.dietary_restrictions.filter((item) => item !== 'none'),
    accessibility_requirements: draft.accessibility_requirements.filter(
      (item) => item !== 'none',
    ),
    walking_tolerance: draft.walking_tolerance,
    distance_unit: draft.distance_unit,
    temperature_unit: draft.temperature_unit,
    time_format: draft.time_format,
    updated_at: now,
  };

  if (!env.isSupabaseConfigured) {
    const profile = await getLocalProfile();
    if (!profile) {
      throw new AppError('Local profile missing', { code: 'PROFILE_MISSING' });
    }

    const nextProfile = await saveLocalProfile({
      ...profile,
      full_name: draft.full_name,
      onboarding_completed: true,
      updated_at: now,
    });
    const nextPreferences = await saveLocalPreferences(preferencesPayload);
    return { profile: nextProfile, preferences: nextPreferences };
  }

  const client = assertSupabase();

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .update({
      full_name: draft.full_name,
      onboarding_completed: true,
      updated_at: now,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (profileError) {
    throw toAppError(profileError, 'Failed to update profile');
  }

  const { data: preferences, error: preferencesError } = await client
    .from('user_preferences')
    .upsert(
      {
        ...preferencesPayload,
        user_id: userId,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (preferencesError) {
    throw toAppError(preferencesError, 'Failed to save preferences');
  }

  return {
    profile: profile as Profile,
    preferences: preferences as UserPreferences,
  };
}

export async function updateProfileName(userId: string, fullName: string): Promise<Profile> {
  if (!env.isSupabaseConfigured) {
    const profile = await getLocalProfile();
    if (!profile) {
      throw new AppError('Local profile missing', { code: 'PROFILE_MISSING' });
    }
    return saveLocalProfile({
      ...profile,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    });
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    throw toAppError(error, 'Failed to update name');
  }

  return data as Profile;
}

export async function updateHomeCurrency(
  userId: string,
  currency: string,
): Promise<UserPreferences> {
  const existing = await fetchPreferences(userId);
  if (!existing) {
    throw new AppError('Preferences missing', { code: 'PREFS_MISSING' });
  }

  const updated_at = new Date().toISOString();
  const next: UserPreferences = {
    ...existing,
    home_currency: currency,
    updated_at,
  };

  if (!env.isSupabaseConfigured) {
    return saveLocalPreferences(next);
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('user_preferences')
    .update({ home_currency: currency, updated_at })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw toAppError(error, 'Failed to update currency');
  }

  return userPreferencesSchema.parse({
    ...data,
    traveling_with_kids: data.traveling_with_kids ?? false,
    kids_ages: data.kids_ages ?? [],
    traveling_with_elderly: data.traveling_with_elderly ?? false,
    elderly_ages: data.elderly_ages ?? [],
  });
}