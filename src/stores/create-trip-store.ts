import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TripBudgetLevel, TripPace, TripPlanningMode } from '@/types/domain';
import { defaultTripDates } from '@/utils/dates';

export const CREATE_TRIP_STEPS = [
  'destination',
  'dates',
  'travelers',
  'style',
  'pace',
  'interests',
  'budget',
  'transport',
  'hotel',
  'build',
] as const;

export type CreateTripStep = (typeof CREATE_TRIP_STEPS)[number];

export type HotelDraftChoice = 'have' | 'find' | 'later';

export type CreateTripDraft = {
  stepIndex: number;
  destinations: string[];
  startDate: string;
  endDate: string | null;
  openEnded: boolean;
  adults: number;
  children: number;
  infants: number;
  rooms: number;
  travelStyle: string;
  pace: TripPace;
  interests: string[];
  budgetLevel: TripBudgetLevel;
  totalBudget?: number;
  dailyBudget?: number;
  homeCurrency: string;
  transportPreferences: string[];
  walkingTolerance: 'low' | 'medium' | 'high';
  hotelChoice: HotelDraftChoice;
  hotelName: string;
  hotelAddress: string;
  hotelCheckIn: string;
  hotelCheckOut: string;
  hotelReservation: string;
  hotelNotes: string;
  planningMode: TripPlanningMode;
  title: string;
};

function freshDraft(): CreateTripDraft {
  const dates = defaultTripDates();
  return {
    stepIndex: 0,
    destinations: [],
    startDate: dates.startDate,
    endDate: dates.endDate,
    openEnded: false,
    adults: 2,
    children: 0,
    infants: 0,
    rooms: 1,
    travelStyle: 'couple',
    pace: 'balanced',
    interests: [],
    budgetLevel: 'mid_range',
    homeCurrency: 'PHP',
    transportPreferences: ['public_transport', 'walking'],
    walkingTolerance: 'medium',
    hotelChoice: 'later',
    hotelName: '',
    hotelAddress: '',
    hotelCheckIn: dates.startDate,
    hotelCheckOut: dates.endDate,
    hotelReservation: '',
    hotelNotes: '',
    planningMode: 'ai',
    title: '',
  };
}

type CreateTripStore = CreateTripDraft & {
  setField: <K extends keyof CreateTripDraft>(key: K, value: CreateTripDraft[K]) => void;
  patch: (partial: Partial<CreateTripDraft>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  reset: () => void;
};

export const useCreateTripStore = create<CreateTripStore>()(
  persist(
    (set, get) => ({
      ...freshDraft(),
      setField: (key, value) => set({ [key]: value } as Partial<CreateTripDraft>),
      patch: (partial) => set(partial),
      nextStep: () => {
        const { stepIndex } = get();
        if (stepIndex < CREATE_TRIP_STEPS.length - 1) {
          set({ stepIndex: stepIndex + 1 });
        }
      },
      prevStep: () => {
        const { stepIndex } = get();
        if (stepIndex > 0) {
          set({ stepIndex: stepIndex - 1 });
        }
      },
      goToStep: (index) => {
        if (index >= 0 && index < CREATE_TRIP_STEPS.length) {
          set({ stepIndex: index });
        }
      },
      reset: () => set(freshDraft()),
    }),
    {
      name: 'travelassistant-create-trip-draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const {
          setField: _s,
          patch: _p,
          nextStep: _n,
          prevStep: _pr,
          goToStep: _g,
          reset: _r,
          ...draft
        } = state;
        return draft;
      },
    },
  ),
);

export const TRAVEL_STYLES = [
  { id: 'solo', label: 'Solo' },
  { id: 'couple', label: 'Couple' },
  { id: 'family', label: 'Family' },
  { id: 'friends', label: 'Friends' },
  { id: 'backpacker', label: 'Backpacker' },
  { id: 'business', label: 'Business' },
  { id: 'digital_nomad', label: 'Digital Nomad' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'budget', label: 'Budget' },
] as const;

export const PACE_OPTIONS: Array<{ id: TripPace; label: string; hint: string }> = [
  { id: 'relaxed', label: 'Relaxed', hint: 'More free time and fewer attractions.' },
  { id: 'balanced', label: 'Balanced', hint: 'Mix of sightseeing and rest.' },
  { id: 'packed', label: 'Packed', hint: 'Maximum sightseeing with realistic transport.' },
];

export const INTEREST_OPTIONS = [
  'Food',
  'Local Cuisine',
  'Shopping',
  'Nature',
  'Beaches',
  'History',
  'Museums',
  'Architecture',
  'Theme Parks',
  'Kids Activities',
  'Nightlife',
  'Photography',
  'Adventure',
  'Religious Sites',
  'Coffee',
  'Hidden Gems',
  'Culture',
  'Local Experiences',
] as const;

export const BUDGET_LEVELS: Array<{ id: TripBudgetLevel; label: string }> = [
  { id: 'budget', label: 'Budget' },
  { id: 'mid_range', label: 'Mid-range' },
  { id: 'premium', label: 'Premium' },
  { id: 'luxury', label: 'Luxury' },
];

export const TRANSPORT_OPTIONS = [
  { id: 'public_transport', label: 'Public Transportation' },
  { id: 'walking', label: 'Walking' },
  { id: 'train', label: 'Train' },
  { id: 'bus', label: 'Bus' },
  { id: 'subway', label: 'Subway' },
  { id: 'taxi', label: 'Taxi' },
  { id: 'uber', label: 'Uber' },
  { id: 'grab', label: 'Grab' },
  { id: 'rental_car', label: 'Rental Car' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'mixed', label: 'Mixed' },
] as const;

export const DURATION_PRESETS = [1, 2, 3, 5, 7, 10, 14, 15, 21, 30] as const;
