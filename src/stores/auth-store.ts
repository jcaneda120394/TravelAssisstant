import { create } from 'zustand';

import type { AuthUser, Profile, UserPreferences } from '@/types/auth';

type AuthState = {
  isHydrated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  setHydrated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setPreferences: (preferences: UserPreferences | null) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isHydrated: false,
  isLoading: true,
  user: null,
  profile: null,
  preferences: null,
  setHydrated: (value) => set({ isHydrated: value }),
  setLoading: (value) => set({ isLoading: value }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setPreferences: (preferences) => set({ preferences }),
  reset: () =>
    set({
      user: null,
      profile: null,
      preferences: null,
      isLoading: false,
    }),
}));
