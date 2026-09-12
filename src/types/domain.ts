export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type PlaceCategory =
  | 'restaurant'
  | 'attraction'
  | 'hotel'
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'police'
  | 'fire'
  | 'embassy'
  | 'atm'
  | 'bank'
  | 'convenience'
  | 'coworking'
  | 'transit_station'
  | 'airport'
  | 'other';

export type Place = {
  id: string;
  provider: string;
  providerPlaceId: string;
  name: string;
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
    | 'taxi_rideshare';
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
  temperatureC: number;
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

export type Trip = {
  id: string;
  ownerId: string;
  title: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  adults: number;
  children: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  memberIds: string[];
};

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
