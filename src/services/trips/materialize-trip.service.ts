import { upsertBudget } from '@/services/budget/budget.service';
import { addItineraryItem } from '@/services/itinerary/itinerary.service';
import { upsertItineraryDay } from '@/services/trips/itinerary-days.service';
import { addTripAccommodation } from '@/services/trips/trip-accommodations.service';
import { replaceTripDestinations } from '@/services/trips/trip-destinations.service';
import { replaceTransportSegmentsForDay } from '@/services/trips/transport-segments.service';
import {
  createTrip,
  getTrip,
  updateTrip,
  type CreateTripInput,
} from '@/services/trips/trips.service';
import type {
  ItineraryItem,
  ItineraryItemKind,
  Place,
  Trip,
  TripAccommodation,
} from '@/types/domain';

export type MaterializeActivity = {
  title: string;
  kind?: ItineraryItemKind | string;
  startTime: string;
  endTime: string;
  notes?: string;
  estimatedCost?: number;
  currency?: string;
  placeId?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  feeLabel?: string;
  priority?: ItineraryItem['priority'];
  flexibility?: ItineraryItem['flexibility'];
  itemStatus?: ItineraryItem['itemStatus'];
  dataConfidence?: ItineraryItem['dataConfidence'];
  transportSummary?: string;
};

export type MaterializeDay = {
  day: string;
  title?: string;
  city?: string;
  country?: string;
  summary?: string;
  activities: MaterializeActivity[];
};

export type MaterializeDestination = {
  label: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  order?: number;
  arrivalDay?: string;
  departureDay?: string;
};

export type MaterializeStay = Omit<TripAccommodation, 'id' | 'order' | 'tripId'> & {
  order?: number;
};

export type MaterializeCanonicalTripInput = {
  tripInput: CreateTripInput;
  /** When set, append activities onto this trip instead of creating a new one. */
  existingTripId?: string;
  /** When appending, also patch trip metadata from tripInput. Default false. */
  patchExistingTrip?: boolean;
  destinations?: MaterializeDestination[];
  days?: MaterializeDay[];
  stays?: MaterializeStay[];
  budgetTotal?: number;
  budgetCurrency?: string;
  /** Map plan days onto these trip day dates by index. */
  dayOverride?: string[];
  skipTransportSegments?: boolean;
};

export type MaterializeCanonicalTripResult = {
  trip: Trip;
  items: ItineraryItem[];
};

const PLACE_KINDS = new Set<string>([
  'attraction',
  'restaurant',
  'hotel',
  'shopping',
  'nightlife',
  'museum',
  'park',
  'cafe',
  'check_in',
  'check_out',
]);

export function mapSuggestionKindToItineraryKind(
  kind: string | undefined,
): ItineraryItemKind {
  switch (kind) {
    case 'attraction':
      return 'attraction';
    case 'restaurant':
      return 'restaurant';
    case 'hotel':
      return 'hotel';
    case 'shopping':
      return 'shopping';
    case 'nightlife':
      return 'nightlife';
    case 'logistics':
      return 'logistics';
    case 'breakfast':
    case 'lunch':
    case 'dinner':
    case 'transport':
    case 'flight':
    case 'train':
    case 'bus':
    case 'ferry':
    case 'rest':
    case 'free_time':
    case 'coworking':
    case 'airport':
    case 'check_in':
    case 'check_out':
    case 'custom':
      return kind;
    case 'break':
      return 'rest';
    default:
      return 'custom';
  }
}

export function activityNotesWithFee(activity: MaterializeActivity): string | undefined {
  const parts = [activity.notes, activity.feeLabel ? `Fee: ${activity.feeLabel}` : null].filter(
    Boolean,
  );
  return parts.length ? parts.join(' · ') : undefined;
}

export function isPlaceLikeActivity(activity: MaterializeActivity): boolean {
  const kind = mapSuggestionKindToItineraryKind(activity.kind);
  if (PLACE_KINDS.has(kind)) return true;
  return Boolean(activity.placeId || (activity.latitude != null && activity.longitude != null));
}

export function buildTransportSegmentSummaries(
  activities: MaterializeActivity[],
): Array<{ fromIndex: number; toIndex: number; summary: string; status: 'live_data_required' }> {
  const placeIndexes = activities
    .map((activity, index) => (isPlaceLikeActivity(activity) ? index : -1))
    .filter((index) => index >= 0);
  const segments: Array<{
    fromIndex: number;
    toIndex: number;
    summary: string;
    status: 'live_data_required';
  }> = [];
  for (let i = 0; i < placeIndexes.length - 1; i++) {
    const fromIndex = placeIndexes[i]!;
    const toIndex = placeIndexes[i + 1]!;
    const from = activities[fromIndex]!;
    const to = activities[toIndex]!;
    segments.push({
      fromIndex,
      toIndex,
      summary: `Travel · ${from.placeName || from.title} → ${to.placeName || to.title}`,
      status: 'live_data_required',
    });
  }
  return segments;
}

export function destinationLabels(destinations: MaterializeDestination[]): string[] {
  return destinations.map((dest) => dest.label.trim()).filter(Boolean);
}

export function estimateBudgetFromTemplateParts(parts: {
  accommodation?: number;
  food?: number;
  transport?: number;
  attractions?: number;
  other?: number;
}): number {
  return (
    (parts.accommodation ?? 0) +
    (parts.food ?? 0) +
    (parts.transport ?? 0) +
    (parts.attractions ?? 0) +
    (parts.other ?? 0)
  );
}

export function stayFromPlace(
  place: Place,
  checkIn: string,
  checkOut: string,
): MaterializeStay {
  return {
    name: place.name,
    address: place.address,
    placeId: place.id,
    latitude: place.latitude,
    longitude: place.longitude,
    checkIn,
    checkOut,
    notes: 'Suggested hotel from trip plan — confirm booking details.',
  };
}

/**
 * Persist a blueprint (draft / template / AI plan) into the canonical trip model.
 */
export async function materializeCanonicalTrip(
  input: MaterializeCanonicalTripInput,
): Promise<MaterializeCanonicalTripResult> {
  const destinations: MaterializeDestination[] =
    input.destinations?.length
      ? input.destinations
      : (input.tripInput.destinations ?? []).map((label, order) => ({ label, order }));

  let trip: Trip;
  if (input.existingTripId) {
    if (input.patchExistingTrip) {
      trip = await updateTrip(input.existingTripId, {
        title: input.tripInput.title,
        startDate: input.tripInput.startDate,
        endDate: input.tripInput.endDate,
        openEnded: input.tripInput.openEnded,
        destinations: destinationLabels(destinations).length
          ? destinationLabels(destinations)
          : input.tripInput.destinations,
        adults: input.tripInput.adults,
        children: input.tripInput.children,
        notes: input.tripInput.notes,
        status: input.tripInput.status,
        source: input.tripInput.source,
        pace: input.tripInput.pace,
        travelStyle: input.tripInput.travelStyle,
        budgetLevel: input.tripInput.budgetLevel,
        interests: input.tripInput.interests,
        transportPreferences: input.tripInput.transportPreferences,
        walkingTolerance: input.tripInput.walkingTolerance,
        planningMode: input.tripInput.planningMode,
        travelerProfile: input.tripInput.travelerProfile,
        homeCurrency: input.tripInput.homeCurrency,
      });
    } else {
      const existing = await getTrip(input.existingTripId);
      if (!existing) {
        throw new Error('Trip not found');
      }
      trip = existing;
    }
  } else {
    trip = await createTrip({
      ...input.tripInput,
      destinations: destinationLabels(destinations).length
        ? destinationLabels(destinations)
        : input.tripInput.destinations,
    });
  }

  if (destinations.length && (!input.existingTripId || input.patchExistingTrip)) {
    await replaceTripDestinations(
      trip.id,
      destinations.map((dest, order) => ({
        label: dest.label,
        city: dest.city,
        country: dest.country,
        latitude: dest.latitude,
        longitude: dest.longitude,
        order: dest.order ?? order,
        arrivalDay: dest.arrivalDay,
        departureDay: dest.departureDay,
      })),
    );
  }

  for (const stay of input.stays ?? []) {
    await addTripAccommodation({
      ...stay,
      tripId: trip.id,
    });
  }

  if (input.budgetTotal != null && input.budgetTotal > 0) {
    await upsertBudget({
      tripId: trip.id,
      total: input.budgetTotal,
      currency: input.budgetCurrency ?? input.tripInput.homeCurrency ?? 'USD',
    });
  }

  const createdItems: ItineraryItem[] = [];
  const days = input.days ?? [];

  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const planDay = days[dayIndex]!;
    const day = input.dayOverride?.[dayIndex] ?? planDay.day;

    await upsertItineraryDay({
      tripId: trip.id,
      day,
      dayNumber: dayIndex + 1,
      title: planDay.title,
      city: planDay.city,
      country: planDay.country,
      summary: planDay.summary,
    });

    const dayItemIds: Array<string | undefined> = [];
    for (const [order, activity] of planDay.activities.entries()) {
      const kind = mapSuggestionKindToItineraryKind(activity.kind);
      const confidence =
        activity.dataConfidence ??
        (kind === 'transport' || activity.notes?.includes('live_data_required')
          ? 'live_data_required'
          : 'suggested');
      try {
        const saved = await addItineraryItem({
          tripId: trip.id,
          day,
          startTime: activity.startTime,
          endTime: activity.endTime,
          title: activity.title,
          kind,
          placeId: activity.placeId,
          placeName: activity.placeName,
          latitude: activity.latitude,
          longitude: activity.longitude,
          estimatedCost: activity.estimatedCost,
          currency: activity.currency,
          notes: activityNotesWithFee(activity),
          transportSummary: activity.transportSummary,
          priority:
            activity.priority ??
            (kind === 'attraction' || kind === 'hotel' ? 'recommended' : 'optional'),
          flexibility:
            activity.flexibility ??
            (kind === 'airport' || kind === 'check_in' || kind === 'check_out' || kind === 'flight'
              ? 'fixed'
              : 'flexible'),
          itemStatus: activity.itemStatus ?? 'planned',
          dataConfidence: confidence,
          order,
        });
        createdItems.push(saved);
        dayItemIds[order] = saved.id;
      } catch (error) {
        if (error instanceof Error && /overlap/i.test(error.message)) {
          dayItemIds[order] = undefined;
          continue;
        }
        throw error;
      }
    }

    if (!input.skipTransportSegments) {
      const segmentDefs = buildTransportSegmentSummaries(planDay.activities);
      await replaceTransportSegmentsForDay(
        trip.id,
        day,
        segmentDefs
          .filter(
            (segment) =>
              dayItemIds[segment.fromIndex] && dayItemIds[segment.toIndex],
          )
          .map((segment, order) => ({
            fromItemId: dayItemIds[segment.fromIndex],
            toItemId: dayItemIds[segment.toIndex],
            status: segment.status,
            summary: segment.summary,
            order,
          })),
      );
    }
  }

  return { trip, items: createdItems };
}
