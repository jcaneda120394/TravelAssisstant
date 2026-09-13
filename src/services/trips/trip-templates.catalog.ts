import type { TripBudgetLevel, TripPace } from '@/types/domain';
import { addDaysIso, eachDayBetween, toLocalIsoDate } from '@/utils/dates';

/**
 * Curated trip suggestion templates.
 * These are blueprints that convert into the same Trip + itinerary_items model
 * as Create Trip / AI generation — never a separate suggestion persistence format.
 */
export type TripTemplateActivity = {
  title: string;
  kind:
    | 'hotel'
    | 'breakfast'
    | 'lunch'
    | 'dinner'
    | 'attraction'
    | 'shopping'
    | 'transport'
    | 'train'
    | 'rest'
    | 'airport'
    | 'check_in'
    | 'check_out'
    | 'free_time'
    | 'custom';
  startTime: string;
  endTime: string;
  notes?: string;
  estimatedCost?: number;
  city?: string;
};

export type TripTemplateDay = {
  title: string;
  city?: string;
  country?: string;
  summary?: string;
  activities: TripTemplateActivity[];
};

export type TripTemplate = {
  id: string;
  name: string;
  description: string;
  destinations: string[];
  cities: string[];
  countries: string[];
  durationDays: number;
  travelStyle: string;
  budgetLevel: TripBudgetLevel;
  pace: TripPace;
  interests: string[];
  transportPreferences: string[];
  adults: number;
  children: number;
  hotelArea?: string;
  highlights: string[];
  heroEmoji: string;
  estimatedBudget?: {
    currency: string;
    accommodation: number;
    food: number;
    transport: number;
    attractions: number;
    other?: number;
  };
  days: TripTemplateDay[];
  tags: string[];
};

const tokyoFamily5: TripTemplate = {
  id: 'tokyo-family-explorer-5',
  name: 'Tokyo Family Explorer',
  description: 'A balanced 5-day family plan: arrival ease, classic Tokyo neighborhoods, Disneyland, and a calm departure day.',
  destinations: ['Tokyo', 'Japan'],
  cities: ['Tokyo'],
  countries: ['Japan'],
  durationDays: 5,
  travelStyle: 'family',
  budgetLevel: 'mid_range',
  pace: 'balanced',
  interests: ['Theme Parks', 'Culture', 'Food', 'Kids Activities'],
  transportPreferences: ['subway', 'train', 'walking'],
  adults: 2,
  children: 1,
  hotelArea: 'Shinjuku',
  highlights: ['Shinjuku arrival', 'Harajuku + Shibuya', 'Tokyo Disneyland', 'Asakusa + Skytree'],
  heroEmoji: '🗼',
  estimatedBudget: {
    currency: 'JPY',
    accommodation: 90000,
    food: 45000,
    transport: 18000,
    attractions: 35000,
  },
  tags: ['japan', 'tokyo', 'family', '5 days', 'theme parks'],
  days: [
    {
      title: 'Arrival + Shinjuku',
      city: 'Tokyo',
      country: 'Japan',
      summary: 'Light arrival day with hotel settle-in.',
      activities: [
        { title: 'Arrive Narita / Haneda', kind: 'airport', startTime: '10:00', endTime: '11:00', notes: 'Allow immigration + baggage buffer' },
        { title: 'Hotel transfer', kind: 'transport', startTime: '11:30', endTime: '13:00', notes: 'live_data_required for exact route' },
        { title: 'Hotel check-in / drop bags', kind: 'check_in', startTime: '14:00', endTime: '14:30' },
        { title: 'Rest', kind: 'rest', startTime: '14:30', endTime: '16:30' },
        { title: 'Dinner near hotel', kind: 'dinner', startTime: '18:00', endTime: '19:30' },
        { title: 'Shinjuku evening walk', kind: 'attraction', startTime: '19:45', endTime: '21:00' },
      ],
    },
    {
      title: 'Harajuku + Shibuya',
      city: 'Tokyo',
      country: 'Japan',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '08:00', endTime: '09:00' },
        { title: 'Meiji Shrine', kind: 'attraction', startTime: '09:30', endTime: '11:00' },
        { title: 'Harajuku / Takeshita Street', kind: 'shopping', startTime: '11:15', endTime: '12:30' },
        { title: 'Lunch', kind: 'lunch', startTime: '12:45', endTime: '14:00' },
        { title: 'Shibuya Crossing + Shibuya Sky', kind: 'attraction', startTime: '14:30', endTime: '17:00' },
        { title: 'Dinner', kind: 'dinner', startTime: '18:30', endTime: '20:00' },
      ],
    },
    {
      title: 'Tokyo Disneyland',
      city: 'Tokyo',
      country: 'Japan',
      summary: 'Full park day — keep schedule flexible around reservations.',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '07:00', endTime: '07:45' },
        { title: 'Travel to Disneyland', kind: 'transport', startTime: '08:00', endTime: '09:00', notes: 'live_data_required' },
        { title: 'Tokyo Disneyland', kind: 'attraction', startTime: '09:15', endTime: '20:00', estimatedCost: 10900 },
        { title: 'Return to hotel', kind: 'transport', startTime: '20:15', endTime: '21:15', notes: 'live_data_required' },
      ],
    },
    {
      title: 'Asakusa + Tokyo Skytree',
      city: 'Tokyo',
      country: 'Japan',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '08:00', endTime: '09:00' },
        { title: 'Senso-ji & Nakamise', kind: 'attraction', startTime: '09:30', endTime: '11:30' },
        { title: 'Lunch', kind: 'lunch', startTime: '12:00', endTime: '13:15' },
        { title: 'Tokyo Skytree + Solamachi', kind: 'attraction', startTime: '14:00', endTime: '17:30' },
        { title: 'Dinner', kind: 'dinner', startTime: '18:30', endTime: '20:00' },
      ],
    },
    {
      title: 'Shopping + Departure',
      city: 'Tokyo',
      country: 'Japan',
      summary: 'Buffer for checkout and airport.',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '07:30', endTime: '08:30' },
        { title: 'Light shopping / souvenirs', kind: 'shopping', startTime: '09:00', endTime: '11:00' },
        { title: 'Hotel checkout', kind: 'check_out', startTime: '11:00', endTime: '11:30' },
        { title: 'Airport transfer', kind: 'transport', startTime: '12:00', endTime: '14:00', notes: 'live_data_required' },
        { title: 'Departure', kind: 'airport', startTime: '14:30', endTime: '16:00' },
      ],
    },
  ],
};

const hongKongWeekend: TripTemplate = {
  id: 'hong-kong-weekend-3',
  name: 'Hong Kong Family Adventure',
  description: 'Three days covering Kowloon harbour vibes, Disneyland, and Lantau highlights.',
  destinations: ['Hong Kong'],
  cities: ['Hong Kong'],
  countries: ['Hong Kong'],
  durationDays: 3,
  travelStyle: 'family',
  budgetLevel: 'mid_range',
  pace: 'balanced',
  interests: ['Theme Parks', 'Culture', 'Food', 'Photography'],
  transportPreferences: ['public_transport', 'subway', 'ferry'],
  adults: 2,
  children: 1,
  hotelArea: 'Tsim Sha Tsui',
  highlights: ['Victoria Harbour', 'Disneyland', 'Ngong Ping + Peak'],
  heroEmoji: '🌃',
  estimatedBudget: {
    currency: 'HKD',
    accommodation: 4500,
    food: 2200,
    transport: 800,
    attractions: 2800,
  },
  tags: ['hong kong', 'weekend', 'family', '3 days'],
  days: [
    {
      title: 'Kowloon + Harbour',
      city: 'Hong Kong',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '08:00', endTime: '09:00' },
        { title: 'Avenue of Stars', kind: 'attraction', startTime: '09:30', endTime: '10:30' },
        { title: 'Museum stop', kind: 'attraction', startTime: '11:00', endTime: '12:30' },
        { title: 'Lunch', kind: 'lunch', startTime: '12:45', endTime: '14:00' },
        { title: 'Shopping', kind: 'shopping', startTime: '14:30', endTime: '16:30' },
        { title: 'Hotel rest', kind: 'rest', startTime: '17:00', endTime: '18:30' },
        { title: 'Dinner', kind: 'dinner', startTime: '18:45', endTime: '20:00' },
        { title: 'Victoria Harbour / Temple Street', kind: 'attraction', startTime: '20:15', endTime: '22:00' },
      ],
    },
    {
      title: 'Disneyland',
      city: 'Hong Kong',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '07:00', endTime: '07:45' },
        { title: 'Travel to Disneyland', kind: 'transport', startTime: '08:00', endTime: '09:00', notes: 'live_data_required' },
        { title: 'Hong Kong Disneyland', kind: 'attraction', startTime: '09:15', endTime: '20:00' },
        { title: 'Return hotel', kind: 'transport', startTime: '20:15', endTime: '21:15', notes: 'live_data_required' },
      ],
    },
    {
      title: 'Lantau + Central',
      city: 'Hong Kong',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '07:30', endTime: '08:15' },
        { title: 'Ngong Ping Cable Car', kind: 'attraction', startTime: '09:30', endTime: '10:15' },
        { title: 'Tian Tan Buddha', kind: 'attraction', startTime: '10:30', endTime: '11:30' },
        { title: 'Po Lin Monastery', kind: 'attraction', startTime: '11:45', endTime: '12:30' },
        { title: 'Lunch', kind: 'lunch', startTime: '12:45', endTime: '14:00' },
        { title: 'Victoria Peak', kind: 'attraction', startTime: '15:30', endTime: '17:30' },
        { title: 'Dinner', kind: 'dinner', startTime: '18:30', endTime: '20:00' },
      ],
    },
  ],
};

const japanGoldenRoute: TripTemplate = {
  id: 'japan-golden-route-15',
  name: 'Japan Family Adventure',
  description: 'Fifteen days across Tokyo, Mt Fuji, Kyoto, Nara, and Osaka with realistic transfer days.',
  destinations: ['Japan', 'Tokyo', 'Mt Fuji', 'Kyoto', 'Nara', 'Osaka'],
  cities: ['Tokyo', 'Mt Fuji', 'Kyoto', 'Nara', 'Osaka'],
  countries: ['Japan'],
  durationDays: 15,
  travelStyle: 'family',
  budgetLevel: 'mid_range',
  pace: 'balanced',
  interests: ['Culture', 'Food', 'Theme Parks', 'History', 'Nature'],
  transportPreferences: ['train', 'subway', 'walking'],
  adults: 2,
  children: 1,
  hotelArea: 'Multi-city stays',
  highlights: ['Tokyo 5 nights', 'Fuji 2 nights', 'Kyoto 4 nights', 'Osaka 4 nights'],
  heroEmoji: '🗻',
  estimatedBudget: {
    currency: 'JPY',
    accommodation: 280000,
    food: 120000,
    transport: 90000,
    attractions: 85000,
  },
  tags: ['japan', 'multi-city', '15 days', 'family', 'golden route'],
  days: [
    { title: 'Tokyo Arrival', city: 'Tokyo', activities: [
      { title: 'Airport arrival', kind: 'airport', startTime: '11:00', endTime: '12:00' },
      { title: 'Hotel transfer + check-in', kind: 'check_in', startTime: '14:00', endTime: '15:00' },
      { title: 'Rest', kind: 'rest', startTime: '15:00', endTime: '17:00' },
      { title: 'Dinner near hotel', kind: 'dinner', startTime: '18:00', endTime: '19:30' },
    ]},
    { title: 'Harajuku + Shibuya', city: 'Tokyo', activities: [
      { title: 'Breakfast', kind: 'breakfast', startTime: '08:00', endTime: '09:00' },
      { title: 'Meiji Shrine + Harajuku', kind: 'attraction', startTime: '09:30', endTime: '12:30' },
      { title: 'Lunch', kind: 'lunch', startTime: '12:45', endTime: '14:00' },
      { title: 'Shibuya', kind: 'attraction', startTime: '14:30', endTime: '18:00' },
      { title: 'Dinner', kind: 'dinner', startTime: '18:30', endTime: '20:00' },
    ]},
    { title: 'Asakusa + Skytree', city: 'Tokyo', activities: [
      { title: 'Breakfast', kind: 'breakfast', startTime: '08:00', endTime: '09:00' },
      { title: 'Senso-ji', kind: 'attraction', startTime: '09:30', endTime: '12:00' },
      { title: 'Lunch', kind: 'lunch', startTime: '12:15', endTime: '13:30' },
      { title: 'Tokyo Skytree', kind: 'attraction', startTime: '14:00', endTime: '17:00' },
      { title: 'Dinner', kind: 'dinner', startTime: '18:00', endTime: '19:30' },
    ]},
    { title: 'Disneyland', city: 'Tokyo', activities: [
      { title: 'Tokyo Disneyland full day', kind: 'attraction', startTime: '09:00', endTime: '20:00' },
    ]},
    { title: 'Tokyo City Exploration', city: 'Tokyo', activities: [
      { title: 'Tsukiji / Toyosu area', kind: 'attraction', startTime: '09:00', endTime: '12:00' },
      { title: 'Ginza stroll', kind: 'shopping', startTime: '13:30', endTime: '16:30' },
      { title: 'Tokyo Station area', kind: 'attraction', startTime: '17:00', endTime: '19:00' },
    ]},
    { title: 'Tokyo → Mt Fuji', city: 'Mt Fuji', summary: 'Transfer day', activities: [
      { title: 'Breakfast + checkout', kind: 'check_out', startTime: '08:00', endTime: '09:00' },
      { title: 'Train / bus to Fuji area', kind: 'transport', startTime: '09:30', endTime: '12:30', notes: 'live_data_required' },
      { title: 'Hotel check-in', kind: 'check_in', startTime: '14:00', endTime: '14:30' },
      { title: 'Lake / viewpoint', kind: 'attraction', startTime: '15:00', endTime: '17:30' },
      { title: 'Dinner', kind: 'dinner', startTime: '18:30', endTime: '20:00' },
    ]},
    { title: 'Mt Fuji', city: 'Mt Fuji', activities: [
      { title: 'Fuji five lakes / viewpoint day', kind: 'attraction', startTime: '09:00', endTime: '17:00' },
    ]},
    { title: 'Mt Fuji → Kyoto', city: 'Kyoto', summary: 'Long transfer day', activities: [
      { title: 'Checkout', kind: 'check_out', startTime: '08:00', endTime: '08:30' },
      { title: 'Transfer to Kyoto', kind: 'train', startTime: '09:00', endTime: '14:00', notes: 'live_data_required' },
      { title: 'Hotel check-in + rest', kind: 'check_in', startTime: '15:00', endTime: '17:00' },
      { title: 'Dinner', kind: 'dinner', startTime: '18:00', endTime: '19:30' },
    ]},
    { title: 'Kyoto East', city: 'Kyoto', activities: [
      { title: 'Kiyomizu-dera area', kind: 'attraction', startTime: '09:00', endTime: '12:30' },
      { title: 'Gion evening walk', kind: 'attraction', startTime: '16:00', endTime: '18:30' },
    ]},
    { title: 'Arashiyama', city: 'Kyoto', activities: [
      { title: 'Bamboo grove + riverside', kind: 'attraction', startTime: '09:00', endTime: '16:00' },
    ]},
    { title: 'Nara Day Trip', city: 'Nara', activities: [
      { title: 'Day trip to Nara Park + temples', kind: 'attraction', startTime: '08:30', endTime: '17:30' },
    ]},
    { title: 'Kyoto → Osaka', city: 'Osaka', activities: [
      { title: 'Checkout + transfer', kind: 'transport', startTime: '10:00', endTime: '12:00', notes: 'live_data_required' },
      { title: 'Hotel check-in', kind: 'check_in', startTime: '14:00', endTime: '14:30' },
      { title: 'Dotonbori evening', kind: 'attraction', startTime: '17:00', endTime: '20:00' },
    ]},
    { title: 'Universal Studios Japan', city: 'Osaka', activities: [
      { title: 'USJ full day', kind: 'attraction', startTime: '09:00', endTime: '20:00' },
    ]},
    { title: 'Osaka City', city: 'Osaka', activities: [
      { title: 'Castle / neighborhoods / food', kind: 'attraction', startTime: '09:30', endTime: '18:00' },
    ]},
    { title: 'Airport + Departure', city: 'Osaka', activities: [
      { title: 'Checkout', kind: 'check_out', startTime: '09:00', endTime: '09:30' },
      { title: 'Airport transfer', kind: 'transport', startTime: '10:00', endTime: '12:00', notes: 'live_data_required' },
      { title: 'Departure', kind: 'airport', startTime: '13:00', endTime: '15:00' },
    ]},
  ],
};

const japanKoreaExplorer: TripTemplate = {
  id: 'japan-korea-21',
  name: 'Japan + Korea Explorer',
  description: 'Multi-country sample: two weeks in Japan then a week in Seoul/Busan-style pacing.',
  destinations: ['Japan', 'South Korea', 'Tokyo', 'Osaka', 'Seoul'],
  cities: ['Tokyo', 'Kyoto', 'Osaka', 'Seoul'],
  countries: ['Japan', 'South Korea'],
  durationDays: 21,
  travelStyle: 'friends',
  budgetLevel: 'mid_range',
  pace: 'balanced',
  interests: ['Food', 'Culture', 'Shopping', 'Nightlife', 'Local Experiences'],
  transportPreferences: ['train', 'subway', 'walking', 'mixed'],
  adults: 2,
  children: 0,
  hotelArea: 'Multi-country',
  highlights: ['Tokyo', 'Kansai', 'Flight / ferry buffer', 'Seoul week'],
  heroEmoji: '✈️',
  tags: ['multi-country', '21 days', 'japan', 'korea'],
  days: Array.from({ length: 21 }, (_, i) => {
    const city =
      i < 7 ? 'Tokyo' : i < 12 ? 'Kyoto/Osaka' : i === 12 ? 'Transit' : i < 18 ? 'Seoul' : 'Seoul';
    return {
      title: i === 12 ? 'Japan → Korea transfer' : `Day ${i + 1} · ${city}`,
      city,
      country: i < 12 ? 'Japan' : i === 12 ? undefined : 'South Korea',
      activities: [
        {
          title: i === 12 ? 'International transfer day' : `Explore ${city}`,
          kind: i === 12 ? 'transport' : 'attraction',
          startTime: '09:00',
          endTime: '17:00',
          notes: i === 12 ? 'live_data_required · flights/immigration buffer' : 'Customize with AI or nearby search',
        },
        { title: 'Dinner', kind: 'dinner', startTime: '18:30', endTime: '20:00' },
      ],
    } satisfies TripTemplateDay;
  }),
};

const hongKongDay: TripTemplate = {
  id: 'hong-kong-day-explorer-1',
  name: 'Hong Kong Day Explorer',
  description: 'One packed but realistic day: Lantau morning, Central afternoon, harbour evening.',
  destinations: ['Hong Kong'],
  cities: ['Hong Kong'],
  countries: ['Hong Kong'],
  durationDays: 1,
  travelStyle: 'solo',
  budgetLevel: 'mid_range',
  pace: 'packed',
  interests: ['Culture', 'Photography', 'Food'],
  transportPreferences: ['public_transport', 'subway'],
  adults: 1,
  children: 0,
  hotelArea: 'Central / Kowloon',
  highlights: ['Ngong Ping', 'Victoria Peak', 'Harbour'],
  heroEmoji: '🚡',
  tags: ['hong kong', '1 day', 'day trip'],
  days: [
    {
      title: 'Lantau + Peak + Harbour',
      city: 'Hong Kong',
      activities: [
        { title: 'Breakfast', kind: 'breakfast', startTime: '07:30', endTime: '08:15' },
        { title: 'Travel to Tung Chung', kind: 'transport', startTime: '08:30', endTime: '09:20', notes: 'live_data_required' },
        { title: 'Ngong Ping Cable Car', kind: 'attraction', startTime: '09:30', endTime: '10:15' },
        { title: 'Tian Tan Buddha', kind: 'attraction', startTime: '10:15', endTime: '11:15' },
        { title: 'Po Lin Monastery', kind: 'attraction', startTime: '11:30', endTime: '12:15' },
        { title: 'Lunch', kind: 'lunch', startTime: '12:30', endTime: '13:30' },
        { title: 'Travel to Central', kind: 'transport', startTime: '14:00', endTime: '15:15', notes: 'live_data_required' },
        { title: 'Victoria Peak', kind: 'attraction', startTime: '15:30', endTime: '17:30' },
        { title: 'Dinner', kind: 'dinner', startTime: '18:30', endTime: '20:00' },
        { title: 'Victoria Harbour', kind: 'attraction', startTime: '20:15', endTime: '21:15' },
        { title: 'Return hotel', kind: 'transport', startTime: '21:30', endTime: '22:15', notes: 'live_data_required' },
      ],
    },
  ],
};

export const TRIP_TEMPLATES: TripTemplate[] = [
  tokyoFamily5,
  hongKongWeekend,
  japanGoldenRoute,
  japanKoreaExplorer,
  hongKongDay,
];

export type TripSuggestionFilters = {
  destination?: string;
  durationDays?: number;
  travelStyle?: string;
  budgetLevel?: TripBudgetLevel;
  pace?: TripPace;
  interests?: string[];
  adults?: number;
  children?: number;
  transportPreference?: string;
};

export function filterTripTemplates(filters: TripSuggestionFilters = {}): TripTemplate[] {
  const dest = filters.destination?.trim().toLowerCase();
  return TRIP_TEMPLATES.filter((tpl) => {
    if (dest) {
      const hay = [...tpl.destinations, ...tpl.cities, ...tpl.countries, ...tpl.tags, tpl.name]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(dest)) return false;
    }
    if (filters.durationDays != null) {
      // Calendar-picked ranges often land near a template length (±2 days).
      if (Math.abs(tpl.durationDays - filters.durationDays) > 2) return false;
    }
    if (filters.travelStyle && tpl.travelStyle !== filters.travelStyle) return false;
    if (filters.budgetLevel && tpl.budgetLevel !== filters.budgetLevel) return false;
    if (filters.pace && tpl.pace !== filters.pace) return false;
    if (filters.adults != null && tpl.adults < filters.adults) return false;
    if (filters.children != null && filters.children > 0 && tpl.children < 1) return false;
    if (filters.transportPreference) {
      if (!tpl.transportPreferences.includes(filters.transportPreference)) return false;
    }
    if (filters.interests?.length) {
      const set = new Set(tpl.interests.map((i) => i.toLowerCase()));
      const hit = filters.interests.some((i) => set.has(i.toLowerCase()));
      if (!hit) return false;
    }
    return true;
  });
}

/** Materialize template day dates from a chosen start date (and optional length). */
export function templateDayDates(
  template: TripTemplate,
  startDate: string,
  durationDays?: number,
): string[] {
  const days = Math.max(1, Math.min(120, durationDays ?? template.durationDays));
  const end = addDaysIso(days - 1, new Date(`${startDate}T12:00:00`));
  return eachDayBetween(startDate, end).slice(0, days);
}

export function defaultTemplateStartDate(): string {
  return toLocalIsoDate();
}
