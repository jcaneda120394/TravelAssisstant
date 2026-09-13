import { tripCalendarDays } from '@/utils/dates';
import {
  estimateBudgetFromTemplateParts,
  materializeCanonicalTrip,
  stayFromPlace,
  type MaterializeDay,
} from '@/services/trips/materialize-trip.service';
import {
  defaultTemplateStartDate,
  templateDayDates,
  type TripTemplate,
} from '@/services/trips/trip-templates.catalog';
import type { CreateTripInput } from '@/services/trips/trips.service';
import type { CreateTripDraft } from '@/stores/create-trip-store';
import type { Trip, TripBudgetLevel, TripPace } from '@/types/domain';
import {
  generateTripSuggestion,
  type SuggestionStyle,
  type TripSuggestionPlan,
} from '@/services/trips/trip-suggestion.service';

function paceToSuggestionStyle(pace: TripPace, interests: string[]): SuggestionStyle {
  if (pace === 'relaxed') return 'relaxed';
  if (pace === 'packed') return 'sightseeing';
  if (interests.some((i) => /food|cuisine|coffee/i.test(i))) return 'foodie';
  return 'balanced';
}

function draftTitle(draft: CreateTripDraft): string {
  if (draft.title.trim()) return draft.title.trim();
  const dest = draft.destinations.filter(Boolean).join(' + ') || 'My trip';
  return dest;
}

function draftToTripInput(ownerId: string, draft: CreateTripDraft): CreateTripInput {
  const openEnded = draft.openEnded || draft.endDate == null;
  return {
    ownerId,
    title: draftTitle(draft),
    startDate: draft.startDate,
    endDate: openEnded ? null : draft.endDate,
    openEnded,
    destinations: draft.destinations.map((d) => d.trim()).filter(Boolean),
    adults: draft.adults,
    children: draft.children,
    status: draft.planningMode === 'manual' ? 'draft' : 'planned',
    source:
      draft.planningMode === 'ai' || draft.planningMode === 'suggestion'
        ? 'ai_suggestion'
        : 'manual',
    pace: draft.pace,
    travelStyle: draft.travelStyle,
    budgetLevel: draft.budgetLevel,
    interests: draft.interests,
    transportPreferences: draft.transportPreferences,
    walkingTolerance: draft.walkingTolerance,
    planningMode: draft.planningMode,
    homeCurrency: draft.homeCurrency,
    travelerProfile: {
      adults: draft.adults,
      children: draft.children,
      infants: draft.infants,
      travelStyle: draft.travelStyle,
      pace: draft.pace,
      budgetLevel: draft.budgetLevel,
      interests: draft.interests,
      transportPreferences: draft.transportPreferences,
      walkingTolerance: draft.walkingTolerance,
    },
    notes: draft.rooms > 0 ? `Rooms requested: ${draft.rooms}` : undefined,
  };
}

function draftHotelStay(draft: CreateTripDraft) {
  if (draft.hotelChoice !== 'have' || !draft.hotelName.trim()) return [];
  return [
    {
      name: draft.hotelName.trim(),
      address: draft.hotelAddress || undefined,
      checkIn: draft.hotelCheckIn || draft.startDate,
      checkOut: draft.hotelCheckOut || draft.endDate || undefined,
      reservationNumber: draft.hotelReservation || undefined,
      notes: draft.hotelNotes || undefined,
    },
  ];
}

/**
 * Finalize Create Trip draft into the canonical Trip + itinerary model.
 */
export async function finalizeCreateTripDraft(input: {
  ownerId: string;
  draft: CreateTripDraft;
}): Promise<Trip> {
  const { draft } = input;
  const base = draftToTripInput(input.ownerId, draft);
  const openEnded = Boolean(base.openEnded);
  const stays = draftHotelStay(draft);
  const budgetTotal = draft.totalBudget ?? draft.dailyBudget;

  if (draft.planningMode === 'ai') {
    const endForGen = openEnded || !draft.endDate ? draft.startDate : draft.endDate;
    const genEnd = openEnded
      ? (() => {
          const d = new Date(`${draft.startDate}T12:00:00`);
          d.setDate(d.getDate() + 2);
          return d.toISOString().slice(0, 10);
        })()
      : endForGen;

    const plan = await generateTripSuggestion({
      destinationLabel: base.destinations[0] ?? 'Trip',
      startDate: draft.startDate,
      endDate: genEnd,
      currency: draft.homeCurrency,
      style: paceToSuggestionStyle(draft.pace, draft.interests),
      companions: {
        traveling_with_kids: draft.children > 0,
        kids_ages: [],
        traveling_with_elderly: false,
        elderly_ages: [],
      },
    });

    const { materializeSuggestionPlan } = await import('@/services/trips/trip-suggestion.service');
    const { trip } = await materializeSuggestionPlan({
      ownerId: input.ownerId,
      plan,
      adults: draft.adults,
      children: draft.children,
      tripOverrides: {
        ...base,
        source: 'ai_suggestion',
        planningMode: 'ai',
        openEnded,
        endDate: openEnded ? null : draft.endDate,
        status: 'planned',
      },
      extraStays: stays,
      budgetTotal: budgetTotal && budgetTotal > 0 ? budgetTotal : undefined,
      budgetCurrency: draft.homeCurrency,
    });
    return trip;
  }

  const days: MaterializeDay[] = [];
  if (draft.planningMode === 'manual' && openEnded) {
    const calendar = tripCalendarDays({
      startDate: draft.startDate,
      endDate: null,
      openEnded: true,
      durationDays: 1,
    });
    days.push({
      day: calendar[0]!,
      title: 'Day 1',
      summary: 'Open-ended trip — add days and activities anytime.',
      activities: [
        {
          title: 'Plan your first day',
          kind: 'free_time',
          startTime: '09:00',
          endTime: '10:00',
          notes: 'Open-ended trip — add days and activities anytime.',
          dataConfidence: 'suggested',
          flexibility: 'flexible',
          priority: 'optional',
        },
      ],
    });
  }

  const { trip } = await materializeCanonicalTrip({
    tripInput: base,
    destinations: base.destinations.map((label, order) => ({ label, order })),
    days,
    stays,
    budgetTotal: budgetTotal && budgetTotal > 0 ? budgetTotal : undefined,
    budgetCurrency: draft.homeCurrency,
    skipTransportSegments: days.length === 0,
  });
  return trip;
}

/**
 * Clone a curated template into a saved editable Trip (canonical model).
 */
export async function useTripTemplate(input: {
  ownerId: string;
  template: TripTemplate;
  startDate?: string;
  overrides?: Partial<{
    adults: number;
    children: number;
    pace: TripPace;
    budgetLevel: TripBudgetLevel;
    travelStyle: string;
    durationDays: number;
  }>;
}): Promise<Trip> {
  const startDate = input.startDate ?? defaultTemplateStartDate();
  const adults = input.overrides?.adults ?? input.template.adults;
  const children = input.overrides?.children ?? input.template.children;
  const pace = input.overrides?.pace ?? input.template.pace;
  const budgetLevel = input.overrides?.budgetLevel ?? input.template.budgetLevel;
  const travelStyle = input.overrides?.travelStyle ?? input.template.travelStyle;

  const dayDates = templateDayDates(
    input.template,
    startDate,
    input.overrides?.durationDays,
  );
  const endDate = dayDates[dayDates.length - 1] ?? startDate;
  const daysToUse = input.template.days.slice(0, dayDates.length);

  const days: MaterializeDay[] = daysToUse.map((dayTpl, i) => ({
    day: dayDates[i]!,
    title: dayTpl.title,
    city: dayTpl.city,
    country: dayTpl.country,
    summary: dayTpl.summary,
    activities: dayTpl.activities.map((act) => ({
      title: act.title,
      kind: act.kind,
      startTime: act.startTime,
      endTime: act.endTime,
      notes: act.notes,
      estimatedCost: act.estimatedCost,
      currency: input.template.estimatedBudget?.currency,
      placeName: act.city ? `${act.title} · ${act.city}` : undefined,
      dataConfidence:
        act.notes?.includes('live_data_required') || act.kind === 'transport'
          ? 'live_data_required'
          : 'suggested',
    })),
  }));

  const budgetParts = input.template.estimatedBudget;
  const budgetTotal = budgetParts
    ? estimateBudgetFromTemplateParts(budgetParts)
    : undefined;

  const { trip } = await materializeCanonicalTrip({
    tripInput: {
      ownerId: input.ownerId,
      title: input.template.name,
      description: input.template.description,
      startDate,
      endDate,
      openEnded: false,
      destinations: input.template.destinations,
      adults,
      children,
      status: 'planned',
      source: 'template',
      planningMode: 'suggestion',
      pace,
      travelStyle,
      budgetLevel,
      interests: input.template.interests,
      transportPreferences: input.template.transportPreferences,
      homeCurrency: input.template.estimatedBudget?.currency ?? 'USD',
      travelerProfile: {
        adults,
        children,
        travelStyle,
        pace,
        budgetLevel,
        interests: input.template.interests,
        transportPreferences: input.template.transportPreferences,
      },
      notes: input.template.description,
    },
    destinations: input.template.cities.map((city, order) => ({
      label: city,
      city,
      country: input.template.countries[0],
      order,
    })),
    days,
    stays: input.template.hotelArea
      ? [
          {
            name: `Suggested stay · ${input.template.hotelArea}`,
            city: input.template.cities[0],
            checkIn: startDate,
            checkOut: endDate,
            notes: 'Placeholder from suggestion — replace with a real booking.',
          },
        ]
      : [],
    budgetTotal: budgetTotal && budgetTotal > 0 ? budgetTotal : undefined,
    budgetCurrency: input.template.estimatedBudget?.currency ?? 'USD',
  });

  return trip;
}

export { stayFromPlace };
