import { providers } from '@/providers/registry';
import { searchDestinations } from '@/services/geo/geocode.service';
import { getLocalPlacePools } from '@/services/places/local-places.catalog';
import { searchCatalogNearby, searchPhotonNearby } from '@/services/places/photon-nearby.service';
import { rememberPlaces } from '@/services/places/place-cache';
import { getWorldNearbyPlaces } from '@/services/places/world-places.catalog';
import {
  materializeCanonicalTrip,
  stayFromPlace,
  type MaterializeDay,
  type MaterializeStay,
} from '@/services/trips/materialize-trip.service';
import { type CreateTripInput } from '@/services/trips/trips.service';
import type { GeoPoint, ItineraryItem, Place, Trip } from '@/types/domain';
import { eachDayBetween } from '@/utils/dates';
import type { CompanionPrefs } from '@/utils/companion-suitability';
import { applyCompanionFilter, companionFilterActive } from '@/utils/companion-suitability';
import { sortPlacesByCategoryPopularity } from '@/utils/place-popularity';
import { buildRealisticItineraryDays } from '@/services/trips/realistic-itinerary.planner';

export type SuggestionKind =
  | 'attraction'
  | 'restaurant'
  | 'hotel'
  | 'logistics'
  | 'shopping'
  | 'nightlife';

export type SuggestionStyle = 'balanced' | 'sightseeing' | 'foodie' | 'relaxed';

export type TripSuggestionItem = {
  id: string;
  kind: SuggestionKind;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  estimatedCost?: number;
  currency: string;
  placeId?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  feeLabel?: string;
};

export type TripSuggestionDay = {
  day: string;
  items: TripSuggestionItem[];
};

export type TripSuggestionPlan = {
  destinationLabel: string;
  location: GeoPoint;
  startDate: string;
  endDate: string;
  currency: string;
  style: SuggestionStyle;
  days: TripSuggestionDay[];
  hotel?: Place | null;
  /** Popular destinations near the selected place (always filled when available). */
  popularDestinations?: Place[];
};

export type GenerateTripSuggestionInput = {
  destinationLabel: string;
  location?: GeoPoint | null;
  startDate: string;
  endDate: string;
  currency?: string;
  style?: SuggestionStyle;
  companions?: CompanionPrefs | null;
};

function shortCity(label: string): string {
  return label.split(',')[0]?.trim() || label.trim();
}

/** Strip road/POI suffixes so “SJDM–Norzagaray Road” becomes a usable city query. */
function cityHintFromLabel(label: string): string {
  const head = label.split(/[–—,|/]/)[0]?.trim() || label.trim();
  const cleaned = head
    .replace(
      /\b(road|rd\.?|highway|hwy\.?|street|st\.?|avenue|ave\.?|blvd\.?|compound|cemetery|heights|park|plaza)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 3 ? cleaned : head;
}

function looksLikeNonCityDestination(label: string): boolean {
  return /\b(road|rd\.?|highway|hwy\.?|street|st\.?|avenue|ave\.?|blvd\.?|compound|cemetery)\b/i.test(
    label,
  );
}

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function uniqueNamedPlaces(places: Place[], origin: GeoPoint): Place[] {
  const seen = new Set<string>();
  return places
    .map((place) => ({
      ...place,
      distanceMeters:
        place.distanceMeters ??
        Math.round(
          haversineMeters(origin, {
            latitude: place.latitude,
            longitude: place.longitude,
          }),
        ),
    }))
    .filter((place) => {
      const name = place.name?.trim() ?? '';
      if (name.length < 3) {
        return false;
      }
      // Drop non-specific / admin noise.
      if (
        /^(unnamed|yes|no|philippines|bulacan|metro manila)$/i.test(name) ||
        /^(breakfast|lunch|dinner|brunch|cafe|restaurant|hotel|attraction|park)$/i.test(name)
      ) {
        return false;
      }
      const key = `${name.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

async function withBudget<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.then((value) => value).catch(() => null),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

/** City-scoped search + nearby + curated popular destinations (always included). */
async function loadNamedPlacePools(
  cityLabel: string,
  location: GeoPoint,
): Promise<{
  attractions: Place[];
  restaurants: Place[];
  hotels: Place[];
  shopping: Place[];
  popularDestinations: Place[];
}> {
  const city = shortCity(cityLabel);
  const local = getLocalPlacePools(location);

  // Curated popular destinations near the selected place — always seed the plan.
  const popularDestinations = sortPlacesByCategoryPopularity(
    uniqueNamedPlaces(
      [
        ...getWorldNearbyPlaces({
          location,
          category: 'attraction',
          radiusMeters: 100_000,
          limit: 40,
        }),
        ...searchCatalogNearby({
          location,
          category: 'attraction',
          radiusMeters: 100_000,
          limit: 40,
        }),
      ],
      location,
    ),
    'attraction',
  );

  const popularFood = sortPlacesByCategoryPopularity(
    uniqueNamedPlaces(
      [
        ...getWorldNearbyPlaces({
          location,
          category: 'restaurant',
          radiusMeters: 80_000,
          limit: 20,
        }),
        ...searchCatalogNearby({
          location,
          category: 'restaurant',
          radiusMeters: 80_000,
          limit: 20,
        }),
      ],
      location,
    ),
    'restaurant',
  );

  const [live, photonAttr, photonFood] = await Promise.all([
    withBudget(
      (async () => {
        const [attrNear, foodNear, hotelNear, attrSearch, foodSearch, hotelSearch] =
          await Promise.all([
            providers.places.getNearbyPlaces({
              location,
              radiusMeters: 80_000,
              category: 'attraction',
              limit: 40,
            }),
            providers.places.getNearbyPlaces({
              location,
              radiusMeters: 40_000,
              category: 'restaurant',
              limit: 30,
            }),
            providers.places.getNearbyPlaces({
              location,
              radiusMeters: 40_000,
              category: 'hotel',
              limit: 12,
            }),
            providers.places.searchPlaces({
              query: `popular attractions ${city}`,
              location,
              limit: 20,
            }),
            providers.places.searchPlaces({
              query: `best restaurants ${city}`,
              location,
              limit: 16,
            }),
            providers.places.searchPlaces({
              query: `hotels ${city}`,
              location,
              limit: 8,
            }),
          ]);

        const attractions = uniqueNamedPlaces([...attrSearch, ...attrNear], location);
        const restaurants = uniqueNamedPlaces([...foodSearch, ...foodNear], location);
        const hotels = uniqueNamedPlaces([...hotelSearch, ...hotelNear], location);
        const shopping = uniqueNamedPlaces(
          attractions.filter(
            (place) =>
              place.category === 'mall' ||
              place.category === 'shopping' ||
              place.category === 'market' ||
              /mall|market|bazaar|outlet|shop/i.test(place.name),
          ),
          location,
        );
        return { attractions, restaurants, hotels, shopping };
      })(),
      8_000,
    ),
    searchPhotonNearby({
      location,
      category: 'attraction',
      cityLabel,
      radiusMeters: 80_000,
      limit: 30,
    }).catch(() => [] as Place[]),
    searchPhotonNearby({
      location,
      category: 'restaurant',
      cityLabel,
      radiusMeters: 40_000,
      limit: 24,
    }).catch(() => [] as Place[]),
  ]);

  // Popular curated destinations first, then live/Photon fills the rest.
  const attractions = sortPlacesByCategoryPopularity(
    uniqueNamedPlaces(
      [
        ...popularDestinations,
        ...(live?.attractions ?? []),
        ...photonAttr,
        ...local.attractions,
      ],
      location,
    ),
    'attraction',
  );

  const restaurants = sortPlacesByCategoryPopularity(
    uniqueNamedPlaces(
      [
        ...popularFood,
        ...(live?.restaurants ?? []),
        ...photonFood,
        ...local.restaurants,
      ],
      location,
    ),
    'restaurant',
  );

  const hotels = sortPlacesByCategoryPopularity(
    uniqueNamedPlaces([...(live?.hotels ?? []), ...local.hotels], location),
    'hotel',
  );

  const shopping = sortPlacesByCategoryPopularity(
    uniqueNamedPlaces(
      [
        ...(live?.shopping ?? []),
        ...photonAttr.filter(
          (place) =>
            place.category === 'mall' ||
            place.category === 'shopping' ||
            place.category === 'market' ||
            /mall|market|shop/i.test(place.name),
        ),
        ...local.shopping,
        ...attractions.filter(
          (place) =>
            place.category === 'mall' ||
            place.category === 'market' ||
            /mall|market|village|shopping/i.test(place.name),
        ),
      ],
      location,
    ),
    'shopping',
  );

  rememberPlaces([...attractions, ...restaurants, ...hotels, ...shopping].slice(0, 80));

  return {
    attractions,
    restaurants,
    hotels,
    shopping,
    popularDestinations: popularDestinations.slice(0, 20),
  };
}

async function resolveLocation(
  destinationLabel: string,
  location?: GeoPoint | null,
): Promise<{ label: string; location: GeoPoint }> {
  const raw = destinationLabel.trim();
  const hint = cityHintFromLabel(raw);
  const badLabel = looksLikeNonCityDestination(raw);

  try {
    const hits = await searchDestinations(hint || raw);
    const preferred =
      hits.find((hit) => hit.kind === 'city') ??
      hits.find((hit) => hit.kind === 'region') ??
      hits[0];

    if (preferred) {
      const preferredPoint = {
        latitude: preferred.latitude,
        longitude: preferred.longitude,
      };
      // Keep user coords when they picked a real city nearby; replace road/POI pins.
      if (location && !badLabel) {
        const distance = haversineMeters(location, preferredPoint);
        if (distance <= 45_000) {
          return {
            label: preferred.shortName || preferred.label,
            location,
          };
        }
      }
      return {
        label: preferred.shortName || preferred.label,
        location: preferredPoint,
      };
    }
  } catch {
    // Fall through.
  }

  if (location) {
    return { label: hint || shortCity(raw) || 'Nearby', location };
  }

  throw new Error(`Could not find “${destinationLabel}”. Try another city name.`);
}

function companionNotes(companions: CompanionPrefs | null | undefined, style: SuggestionStyle): string {
  const bits = [`Style: ${style}.`];
  if (companions?.traveling_with_kids) {
    const ages = companions.kids_ages?.length
      ? `ages ${companions.kids_ages.join(', ')}`
      : 'kids';
    bits.push(`Kid-friendly stops (${ages}).`);
  }
  if (companions?.traveling_with_elderly) {
    const ages = companions.elderly_ages?.length
      ? `ages ${companions.elderly_ages.join(', ')}`
      : 'elderly';
    bits.push(`Gentle pacing for ${ages}.`);
  }
  bits.push('Realistic pacing: travel buffers, meal breaks, and lighter arrival/departure days.');
  return bits.join(' ');
}

export async function generateTripSuggestion(
  input: GenerateTripSuggestionInput,
): Promise<TripSuggestionPlan> {
  const currency = input.currency ?? 'PHP';
  const style: SuggestionStyle = input.style ?? 'balanced';
  const resolved = await resolveLocation(input.destinationLabel.trim(), input.location);
  const days = eachDayBetween(input.startDate, input.endDate).slice(0, 15);

  const { attractions, restaurants, hotels, shopping, popularDestinations } =
    await loadNamedPlacePools(resolved.label, resolved.location);

  const tailor = <T extends Place>(pool: T[]) =>
    companionFilterActive(input.companions)
      ? (applyCompanionFilter(pool, input.companions) as T[])
      : pool;

  const attractionsPool = tailor(
    sortPlacesByCategoryPopularity(
      uniqueNamedPlaces([...popularDestinations, ...attractions], resolved.location),
      'attraction',
    ),
  );
  const restaurantsPool = tailor(restaurants);
  const shoppingPool = tailor(shopping);
  const hotel = hotels[0] ?? null;

  const planDays = buildRealisticItineraryDays({
    days,
    cityLabel: shortCity(resolved.label),
    style,
    currency,
    hotel,
    attractions: attractionsPool,
    restaurants: restaurantsPool,
    shopping: shoppingPool,
    withKids: Boolean(input.companions?.traveling_with_kids),
    companionNotes: companionNotes(input.companions, style),
  });

  return {
    destinationLabel: resolved.label,
    location: resolved.location,
    startDate: days[0] ?? input.startDate,
    endDate: days[days.length - 1] ?? input.endDate,
    currency,
    style,
    days: planDays,
    hotel,
    popularDestinations: popularDestinations.slice(0, 12),
  };
}

export async function planToMaterializeDays(
  plan: TripSuggestionPlan,
  onlyDays?: string[],
): Promise<MaterializeDay[]> {
  const days = onlyDays?.length
    ? plan.days.filter((day) => onlyDays.includes(day.day))
    : plan.days;
  return days.map((day) => ({
    day: day.day,
    title: `Day · ${day.day}`,
    city: plan.destinationLabel,
    activities: day.items.map((item) => ({
      title: item.title,
      kind: item.kind,
      startTime: item.startTime,
      endTime: item.endTime,
      notes: item.notes,
      estimatedCost: item.estimatedCost,
      currency: item.currency,
      placeId: item.placeId,
      placeName: item.placeName,
      latitude: item.latitude,
      longitude: item.longitude,
      feeLabel: item.feeLabel,
      dataConfidence:
        item.kind === 'logistics' ? 'live_data_required' : ('suggested' as const),
    })),
  }));
}

export async function materializeSuggestionPlan(input: {
  ownerId: string;
  plan: TripSuggestionPlan;
  adults?: number;
  children?: number;
  onlyDays?: string[];
  existingTripId?: string;
  dayOverride?: string[];
  tripOverrides?: Partial<CreateTripInput>;
  extraStays?: MaterializeStay[];
  budgetTotal?: number;
  budgetCurrency?: string;
}): Promise<{ trip: Trip; items: ItineraryItem[] }> {
  const days = await planToMaterializeDays(input.plan, input.onlyDays);
  const planDays = input.onlyDays?.length
    ? input.plan.days.filter((day) => input.onlyDays!.includes(day.day))
    : input.plan.days;
  const startDate = planDays[0]?.day ?? input.plan.startDate;
  const endDate = planDays[planDays.length - 1]?.day ?? input.plan.endDate;

  const stays: MaterializeStay[] = [...(input.extraStays ?? [])];
  if (input.plan.hotel && !input.existingTripId) {
    stays.push(stayFromPlace(input.plan.hotel, startDate, endDate));
  }

  const tripInput: CreateTripInput = {
    title: `${input.plan.destinationLabel} · ${input.plan.style}`,
    startDate,
    endDate,
    destinations: [input.plan.destinationLabel],
    adults: input.adults ?? 2,
    children: input.children ?? 0,
    notes: `Generated from Trip Suggestion (${input.plan.style})`,
    source: 'ai_suggestion',
    status: 'planned',
    planningMode: 'ai',
    homeCurrency: input.plan.currency,
    pace:
      input.plan.style === 'relaxed'
        ? 'relaxed'
        : input.plan.style === 'sightseeing'
          ? 'packed'
          : 'balanced',
    ...input.tripOverrides,
    ownerId: input.ownerId,
  };

  const destLabels =
    input.tripOverrides?.destinations?.length
      ? input.tripOverrides.destinations
      : [input.plan.destinationLabel];

  return materializeCanonicalTrip({
    tripInput,
    existingTripId: input.existingTripId,
    patchExistingTrip: Boolean(input.existingTripId && input.tripOverrides),
    destinations: destLabels.map((label, order) => ({
      label,
      city: label,
      latitude: order === 0 ? input.plan.location.latitude : undefined,
      longitude: order === 0 ? input.plan.location.longitude : undefined,
      order,
    })),
    days,
    stays: input.existingTripId ? input.extraStays ?? [] : stays,
    dayOverride: input.dayOverride,
    budgetTotal: input.budgetTotal,
    budgetCurrency: input.budgetCurrency ?? input.plan.currency,
  });
}

export async function saveSuggestionAsNewTrip(input: {
  ownerId: string;
  plan: TripSuggestionPlan;
  adults?: number;
  children?: number;
  /** Save only these plan day ISO dates when set. */
  onlyDays?: string[];
}): Promise<Trip> {
  const { trip } = await materializeSuggestionPlan(input);
  return trip;
}

export async function saveSuggestionToTrip(input: {
  tripId: string;
  plan: TripSuggestionPlan;
  /** Map plan days onto these trip day dates (by index). */
  dayOverride?: string[];
  /** Only save these plan day ISO dates. */
  onlyDays?: string[];
}): Promise<ItineraryItem[]> {
  const { items } = await materializeCanonicalTrip({
    tripInput: {
      ownerId: 'existing',
      title: 'Existing',
      startDate: input.plan.startDate,
      endDate: input.plan.endDate,
      destinations: [input.plan.destinationLabel],
      adults: 2,
      children: 0,
    },
    existingTripId: input.tripId,
    days: await planToMaterializeDays(input.plan, input.onlyDays),
    dayOverride: input.dayOverride,
    stays: [],
  });
  return items;
}
