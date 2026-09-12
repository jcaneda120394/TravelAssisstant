export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type PlaceCategory =
  | 'restaurant'
  | 'attraction'
  | 'hotel'
  | 'shopping'
  | 'mall'
  | 'park'
  | 'museum'
  | 'temple'
  | 'market'
  | 'viewpoint'
  | 'zoo'
  | 'cafe'
  | 'bakery'
  | 'gym'
  | 'nightlife'
  | 'beach'
  | 'spa'
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'police'
  | 'fire'
  | 'embassy'
  | 'atm'
  | 'bank'
  | 'convenience'
  | 'souvenir'
  | 'coworking'
  | 'transit_station'
  | 'airport'
  | 'laundry'
  | 'fuel'
  | 'parking'
  | 'toilet'
  | 'tourist_info'
  | 'post_office'
  | 'bicycle_rental'
  | 'other';

export type Place = {
  id: string;
  provider: string;
  providerPlaceId: string;
  /** Display name — may include "Original (English Translation)". */
  name: string;
  /** Local / original-language name when available. */
  nameOriginal?: string;
  /** English translation when available. */
  nameEnglish?: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  openingHours?: string[];
  photos?: string[];
  phone?: string;
  website?: string;
  /** OSM/menu URL when tagged */
  menuUrl?: string;
  cuisine?: string;
  distanceMeters?: number;
  description?: string;
  priceRange?: string;
  isOpen?: boolean;
  tags?: string[];
};

export type TransportMode =
  | 'walking'
  | 'cycling'
  | 'bus'
  | 'subway'
  | 'metro'
  | 'train'
  | 'tram'
  | 'ferry'
  | 'taxi'
  | 'rideshare'
  | 'driving'
  | 'flight'
  | 'other';

export type RouteSegment = {
  id: string;
  mode: TransportMode;
  instruction: string;
  durationSeconds: number;
  distanceMeters?: number;
  lineName?: string;
  direction?: string;
  fromName?: string;
  toName?: string;
  entrance?: string;
  exit?: string;
  platform?: string;
  fareAmount?: number;
  fareCurrency?: string;
};

export type Route = {
  id: string;
  provider: string;
  summary: string;
  durationSeconds: number;
  walkingDistanceMeters: number;
  transferCount: number;
  departureAt?: string;
  arrivalAt?: string;
  estimatedCost?: number;
  currency?: string;
  /** Ordered path coordinates for map polylines (lat/lng). */
  geometry?: GeoPoint[];
  segments: RouteSegment[];
  warnings?: string[];
  comparisonTag?:
    | 'recommended'
    | 'fastest'
    | 'cheapest'
    | 'least_walking'
    | 'fewest_transfers'
    | 'most_accessible'
    | 'best_with_luggage'
    | 'best_for_families'
    | 'taxi_rideshare'
    | 'bus'
    | 'train'
    | 'flight';
  isMock?: boolean;
};

export type Hotel = {
  id: string;
  provider: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  reviewCount?: number;
  pricePerNight?: number;
  currency?: string;
  photos?: string[];
  amenities?: string[];
  roomType?: string;
  cancellation?: string;
  distanceFromStationMeters?: number;
  isMock?: boolean;
};

export type WeatherSnapshot = {
  locationName: string;
  /** ISO calendar date (YYYY-MM-DD) when this is a daily forecast row. */
  date?: string;
  temperatureC: number;
  /** High for the day when available. */
  temperatureMaxC?: number;
  /** Low for the day when available. */
  temperatureMinC?: number;
  condition: string;
  humidityPercent?: number;
  windKph?: number;
  uvIndex?: number;
  rainChancePercent?: number;
  fetchedAt: string;
  isMock?: boolean;
};

export type CurrencyConversion = {
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
  updatedAt: string;
  isMock?: boolean;
};

export type EsimPlan = {
  id: string;
  provider: string;
  countryCode: string;
  countryName: string;
  dataGb: number;
  validityDays: number;
  price: number;
  currency: string;
  network?: string;
  supports5g?: boolean;
  hotspot?: boolean;
  purchaseUrl?: string;
  bestFor?: string;
  isMock?: boolean;
};

export type AIMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type AIMessage = {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: string;
};

export type AIChatRequest = {
  messages: AIMessage[];
  mode?: 'ask' | 'explore' | 'planner' | 'navigator' | 'emergency' | 'budget';
  context?: Record<string, unknown>;
};

export type AIChatResponse = {
  message: AIMessage;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ name: string; result: unknown }>;
  isMock?: boolean;
};

export type TripStatus = 'draft' | 'planned' | 'active' | 'completed' | 'cancelled';
export type TripSource = 'manual' | 'ai_suggestion' | 'template' | 'imported';
export type TripPace = 'relaxed' | 'balanced' | 'packed';
export type TripBudgetLevel = 'budget' | 'mid_range' | 'premium' | 'luxury';
export type TripPlanningMode = 'ai' | 'suggestion' | 'manual' | 'import';

export type TripTravelerProfile = {
  adults: number;
  children: number;
  infants?: number;
  travelStyle?: string;
  pace?: TripPace;
  budgetLevel?: TripBudgetLevel;
  interests?: string[];
  transportPreferences?: string[];
  walkingTolerance?: 'low' | 'medium' | 'high';
  dietaryPreferences?: string[];
  accessibilityNeeds?: string[];
  kidsAges?: number[];
  elderlyAges?: number[];
  travelingWithKids?: boolean;
  travelingWithElderly?: boolean;
};

export type Trip = {
  id: string;
  ownerId: string;
  title: string;
  /** Optional longer description (stored in notes prefix or notes). */
  description?: string;
  startDate: string;
  /** Null when open-ended travel. */
  endDate: string | null;
  openEnded?: boolean;
  status: TripStatus;
  source: TripSource;
  destinations: string[];
  adults: number;
  children: number;
  travelerProfile?: TripTravelerProfile;
  pace?: TripPace;
  travelStyle?: string;
  budgetLevel?: TripBudgetLevel;
  interests?: string[];
  transportPreferences?: string[];
  walkingTolerance?: 'low' | 'medium' | 'high';
  planningMode?: TripPlanningMode;
  homeCurrency?: string;
  notes?: string;
  /** When true, guests can browse this trip in Travel Guide. */
  isPublic?: boolean;
  publicSummary?: string;
  createdAt: string;
  updatedAt: string;
  memberIds: string[];
};

export type PlaceCheckIn = {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  latitude?: number;
  longitude?: number;
  place: Place;
  visitedAt: string;
  createdAt: string;
};

export type PlaceReview = {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  latitude?: number;
  longitude?: number;
  place?: Place;
  rating: number;
  body: string;
  tripId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  /** Attached community photos when loaded with feed/place queries. */
  photos?: PlaceUserPhoto[];
};

export type PlaceUserPhoto = {
  id: string;
  userId: string;
  placeId: string;
  placeName: string;
  reviewId?: string;
  storagePath: string;
  publicUrl: string;
  caption: string;
  isPublic: boolean;
  createdAt: string;
};

export type TripAccommodation = {
  id: string;
  tripId: string;
  name: string;
  address?: string;
  city?: string;
  checkIn?: string;
  checkOut?: string;
  reservationNumber?: string;
  notes?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  estimatedCost?: number;
  currency?: string;
  order: number;
};

/**
 * Canonical persistence mapping (see also materialize-trip.service):
 * - Trip → public.trips (+ destinations string[] mirrored from trip_destinations labels)
 * - TripDestination → public.trip_destinations (ordered geo/label rows)
 * - ItineraryDay → public.itinerary_days (metadata) + virtual calendar day
 * - Activity → public.itinerary_items (item_kind = kind)
 * - TransportSegment → public.transport_segments (A→B; selected_route jsonb = Route)
 * - Stay → public.trip_accommodations
 * - Budget → public.budgets
 */
export type TripDestination = {
  id: string;
  tripId: string;
  label: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  order: number;
  arrivalDay?: string;
  departureDay?: string;
};

export type ItineraryDayMeta = {
  id: string;
  tripId: string;
  day: string;
  dayNumber: number;
  title?: string;
  city?: string;
  country?: string;
  summary?: string;
};

export type TransportSegmentStatus =
  | 'pending'
  | 'live_data_required'
  | 'ready'
  | 'failed'
  | 'skipped';

/** Trip-scoped leg between activities — distinct from directions RouteSegment. */
export type TransportSegment = {
  id: string;
  tripId: string;
  day: string;
  fromItemId?: string;
  toItemId?: string;
  status: TransportSegmentStatus;
  summary?: string;
  mode?: TransportMode;
  durationSeconds?: number;
  distanceMeters?: number;
  estimatedCost?: number;
  currency?: string;
  provider?: string;
  selectedRoute?: Route;
  alternatives?: Route[];
  fetchedAt?: string;
  order: number;
};

export type ItineraryItemKind =
  | 'hotel'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'attraction'
  | 'shopping'
  | 'transport'
  | 'flight'
  | 'train'
  | 'bus'
  | 'ferry'
  | 'tour'
  | 'rest'
  | 'free_time'
  | 'coworking'
  | 'airport'
  | 'check_in'
  | 'check_out'
  | 'nightlife'
  | 'logistics'
  | 'restaurant'
  | 'custom';

export type TripMemberRole = 'owner' | 'editor' | 'viewer';

export type TripMember = {
  id: string;
  tripId: string;
  userId: string;
  email: string;
  role: TripMemberRole;
  status: 'pending' | 'accepted';
};

export type ItineraryItem = {
  id: string;
  tripId: string;
  day: string;
  startTime: string;
  endTime: string;
  title: string;
  kind?: ItineraryItemKind;
  priority?: 'must_do' | 'recommended' | 'optional';
  flexibility?: 'fixed' | 'flexible';
  itemStatus?: 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  dataConfidence?: 'verified' | 'cached' | 'suggested' | 'live_data_required';
  placeId?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  estimatedCost?: number;
  currency?: string;
  notes?: string;
  transportSummary?: string;
  order: number;
};

export type ExpenseCategory =
  | 'flights'
  | 'hotel'
  | 'food'
  | 'transportation'
  | 'attractions'
  | 'shopping'
  | 'esim'
  | 'insurance'
  | 'miscellaneous';

export type Expense = {
  id: string;
  tripId: string;
  userId: string;
  amount: number;
  currency: string;
  amountHome: number;
  homeCurrency: string;
  category: ExpenseCategory;
  date: string;
  location?: string;
  notes?: string;
  createdAt: string;
};

export type Budget = {
  id: string;
  tripId: string;
  total: number;
  currency: string;
  categories: Partial<Record<ExpenseCategory, number>>;
};

export type SavedPlace = {
  id: string;
  userId: string;
  place: Place;
  collectionId?: string;
  createdAt: string;
};

export type FavoriteCollection = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type: 'transit' | 'weather' | 'booking' | 'budget' | 'general';
};
