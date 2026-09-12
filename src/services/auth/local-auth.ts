import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthUser } from '@/types/auth';
import type { Profile, UserPreferences } from '@/types/auth';

const SESSION_KEY = 'travelassistant.local.auth.session';
const PROFILE_KEY = 'travelassistant.local.auth.profile';
const PREFERENCES_KEY = 'travelassistant.local.auth.preferences';

export type LocalAuthSession = {
  user: AuthUser;
  createdAt: string;
};

function createId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getLocalSession(): Promise<LocalAuthSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as LocalAuthSession;
}

export async function createLocalSession(params: {
  email: string;
  fullName: string;
}): Promise<LocalAuthSession> {
  const existing = await getLocalSession();
  if (existing && existing.user.email === params.email) {
    return existing;
  }

  const user: AuthUser = {
    id: createId(),
    email: params.email,
    fullName: params.fullName,
  };

  const session: LocalAuthSession = {
    user,
    createdAt: new Date().toISOString(),
  };

  const profile: Profile = {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    avatar_url: null,
    onboarding_completed: false,
    role: 'user',
    is_disabled: false,
    created_at: session.createdAt,
    updated_at: session.createdAt,
  };

  const preferences: UserPreferences = {
    user_id: user.id,
    travel_styles: [],
    interests: [],
    budget_tier: null,
    transport_preferences: [],
    home_country: null,
    home_currency: 'USD',
    preferred_language: 'en',
    adults: 1,
    children: 0,
    traveling_with_kids: false,
    kids_ages: [],
    traveling_with_elderly: false,
    elderly_ages: [],
    dietary_restrictions: [],
    accessibility_requirements: [],
    walking_tolerance: null,
    distance_unit: 'km',
    temperature_unit: 'celsius',
    time_format: '24h',
  };

  await AsyncStorage.multiSet([
    [SESSION_KEY, JSON.stringify(session)],
    [PROFILE_KEY, JSON.stringify(profile)],
    [PREFERENCES_KEY, JSON.stringify(preferences)],
  ]);

  return session;
}

export async function clearLocalSession(): Promise<void> {
  await AsyncStorage.multiRemove([SESSION_KEY, PROFILE_KEY, PREFERENCES_KEY]);
}

export async function getLocalProfile(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as Profile) : null;
}

export async function saveLocalProfile(profile: Profile): Promise<Profile> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function getLocalPreferences(): Promise<UserPreferences | null> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  return raw ? (JSON.parse(raw) as UserPreferences) : null;
}

export async function saveLocalPreferences(
  preferences: UserPreferences,
): Promise<UserPreferences> {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  return preferences;
}
