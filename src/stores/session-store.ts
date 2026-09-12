import { create } from 'zustand';

type SessionState = {
  isHydrated: boolean;
  setHydrated: (value: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isHydrated: false,
  setHydrated: (value) => set({ isHydrated: value }),
}));
