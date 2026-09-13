import type { GeoPoint, Place } from '@/types/domain';
import type {
  SuggestionKind,
  SuggestionStyle,
  TripSuggestionDay,
  TripSuggestionItem,
} from '@/services/trips/trip-suggestion.service';
import {
  estimatePlacePrice,
  isFreeOutdoorLandmark,
  isPaidAdmissionAttraction,
} from '@/utils/place-price-estimate';

export type VisitProfile = 'theme_park' | 'major' | 'district' | 'quick' | 'meal' | 'hotel';

type DayRole = 'arrival' | 'full' | 'theme_park' | 'departure';

type DraftBlock = {
  kind: SuggestionKind;
  title: string;
  durationMin: number;
  place?: Place;
  notes?: string;
  feeAmount?: number;
  feeLabel?: string;
  roleLabel?: string;
};

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pointOf(place: Place): GeoPoint {
  return { latitude: place.latitude, longitude: place.longitude };
}

function minutesToTime(totalMin: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMin)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const THEME_PARK_RE =
  /disneyland|disney\s*sea|disneysea|universal studios|ocean park|legoland|six flags|theme park|amusement park|usj\b/i;

const MAJOR_RE =
  /skytree|senso-?ji|fushimi|kiyomizu|meiji|shibuya sky|tower|museum|palace|castle|cathedral|basilica|opera house|bund|petronas|burj|colosseum|louvre|eiffel|sagrada|acropolis|ghibli|teamlab|todai|nara park|arashiyama|bamboo|golden pavilion|kinkaku|imperial|forbidden|great wall/i;

const DISTRICT_RE =
  /harajuku|takeshita|omotesando|shinjuku|ginza|akihabara|asakusa|ueno|gion|dotonbori|yanaka|shimokitazawa|shimokita|nakamise|ameyoko|market|village|crossing|shopping street|night market|chinatown|old quarter|plaza|park/i;

export function classifyVisit(place: Place): VisitProfile {
  const text = `${place.name} ${place.category} ${(place.tags ?? []).join(' ')}`;
  if (THEME_PARK_RE.test(text) || place.tags?.includes('theme park')) return 'theme_park';
  if (place.category === 'hotel') return 'hotel';
  if (place.category === 'restaurant' || place.category === 'cafe' || place.category === 'nightlife') {
    return 'meal';
  }
  if (MAJOR_RE.test(text) || place.category === 'museum' || place.category === 'zoo') return 'major';
  if (DISTRICT_RE.test(text) || place.category === 'shopping' || place.category === 'market' || place.category === 'park') {
    return 'district';
  }
  if (place.category === 'viewpoint' || place.category === 'temple') return 'major';
  return 'quick';
}

/** Typical visit lengths — theme parks are full-day, not 1–2 hour slots. */
export function visitDurationMinutes(
  profile: VisitProfile,
  style: SuggestionStyle,
  withKids = false,
): number {
  const kidBump = withKids ? 20 : 0;
  switch (profile) {
    case 'theme_park':
      return style === 'relaxed' ? 9 * 60 : 8 * 60; // ~8–9 hours on-site
    case 'major':
      return (style === 'sightseeing' ? 120 : 150) + kidBump;
    case 'district':
      return (style === 'relaxed' ? 120 : 90) + kidBump;
    case 'quick':
      return 60 + kidBump;
    case 'meal':
      return style === 'foodie' ? 90 : 70;
    case 'hotel':
      return 30;
    default:
      return 90;
  }
}

/**
 * Rough door-to-door travel estimate from straight-line distance.
 * Includes walking + waiting + typical urban transit — never zero.
 */
export function estimateTravelMinutes(from: GeoPoint, to: GeoPoint): number {
  const meters = haversineMeters(from, to);
  if (meters < 250) return 8; // short walk + buffer
  if (meters < 800) return 15;
  if (meters < 2_000) return 25; // walk or one short hop
  if (meters < 5_000) return 35;
  if (meters < 12_000) return 50;
  if (meters < 25_000) return 70;
  if (meters < 45_000) return 90;
  return 120;
}

export function travelModeLabel(meters: number): string {
  if (meters < 800) return 'Walk';
  if (meters < 5_000) return 'Walk / short transit';
  if (meters < 25_000) return 'Train / subway (est.)';
  return 'Longer transit (est.)';
}

function isSameThemeParkFamily(a: Place, b: Place): boolean {
  const na = a.name.toLowerCase();
  const nb = b.name.toLowerCase();
  const disneyA = /disney/.test(na);
  const disneyB = /disney/.test(nb);
  if (disneyA && disneyB) return true;
  const usjA = /universal/.test(na);
  const usjB = /universal/.test(nb);
  return usjA && usjB;
}

/** Cluster attractions that are geographically close (same neighborhood day). */
export function clusterNearbyPlaces(
  places: Place[],
  maxClusterMeters = 2_800,
  maxPerCluster = 4,
): Place[][] {
  const remaining = [...places];
  const clusters: Place[][] = [];

  while (remaining.length) {
    const seed = remaining.shift()!;
    const cluster: Place[] = [seed];
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (cluster.length >= maxPerCluster) break;
      const candidate = remaining[i]!;
      if (classifyVisit(candidate) === 'theme_park') continue;
      if (isSameThemeParkFamily(seed, candidate)) continue;
      const nearSeed = cluster.some(
        (member) => haversineMeters(pointOf(member), pointOf(candidate)) <= maxClusterMeters,
      );
      if (nearSeed) {
        cluster.push(candidate);
        remaining.splice(i, 1);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/** Convert a Japan-yen-ish base estimate into display currency (rough FX). */
function fromYenEstimate(yen: number, currency: string): number {
  const c = currency.toUpperCase();
  const rate =
    c === 'JPY' ? 1 :
    c === 'PHP' ? 0.38 :
    c === 'USD' ? 0.0067 :
    c === 'HKD' ? 0.052 :
    c === 'EUR' ? 0.0061 :
    1;
  return Math.round((yen * rate) / 10) * 10;
}

export function estimateRealisticFee(
  kind: SuggestionKind,
  place: Place | undefined,
  currency: string,
): { amount: number; feeLabel: string } {
  if (kind === 'attraction' && place) {
    if (place.priceRange?.trim()) {
      return { amount: 0, feeLabel: place.priceRange.trim() };
    }
    if (isFreeOutdoorLandmark(place)) {
      return { amount: 0, feeLabel: 'Free · public outdoor spot' };
    }
    const profile = classifyVisit(place);
    if (profile === 'theme_park') {
      const amount = fromYenEstimate(10_000, currency);
      return {
        amount,
        feeLabel: `Est. park ticket ~${currency} ${amount.toLocaleString()} (timed tickets may apply)`,
      };
    }
    if (isPaidAdmissionAttraction(place)) {
      const est = estimatePlacePrice(place, currency);
      if (est && est.unit === 'ticket' && est.max > 0) {
        return { amount: est.min, feeLabel: est.label };
      }
    }
    if (place.category === 'temple' || place.category === 'park' || place.category === 'viewpoint') {
      return { amount: 0, feeLabel: 'Often free / small donation' };
    }
    return { amount: 0, feeLabel: 'No ticket listed' };
  }

  if (kind === 'restaurant') {
    const amount = fromYenEstimate(1_500, currency);
    return { amount, feeLabel: `Est. meal ~${currency} ${amount.toLocaleString()}` };
  }
  if (kind === 'shopping') {
    return { amount: 0, feeLabel: 'Entry free · shopping spend varies' };
  }
  if (kind === 'nightlife') {
    const amount = fromYenEstimate(2_000, currency);
    return { amount, feeLabel: `Est. evening ~${currency} ${amount.toLocaleString()}` };
  }
  if (kind === 'hotel') {
    return { amount: 0, feeLabel: 'Lodging (separate from day spend)' };
  }
  return { amount: 0, feeLabel: 'No fee / logistics' };
}

function pickRestaurantNear(
  restaurants: Place[],
  near: GeoPoint,
  used: Set<string>,
  maxMeters = 3_500,
): Place | undefined {
  const scorePlace = (place: Place, d: number) => {
    const rating = place.rating ?? 3.8;
    const reviews = Math.min(place.reviewCount ?? 0, 8_000);
    // Prefer highly rated places that are actually nearby.
    return rating * 25 + Math.log10(reviews + 10) * 6 - d / 350;
  };

  const within = restaurants
    .filter((r) => !used.has(r.id))
    .map((r) => {
      const d = haversineMeters(near, pointOf(r));
      return { place: r, d, score: scorePlace(r, d) };
    })
    .filter((x) => x.d <= maxMeters)
    .sort((a, b) => b.score - a.score);

  const expanded = restaurants
    .filter((r) => !used.has(r.id))
    .map((r) => {
      const d = haversineMeters(near, pointOf(r));
      return { place: r, d, score: scorePlace(r, d) };
    })
    .filter((x) => x.d <= Math.max(maxMeters * 2.5, 12_000))
    .sort((a, b) => b.score - a.score);

  const chosen = within[0]?.place ?? expanded[0]?.place;
  if (chosen) used.add(chosen.id);
  return chosen;
}

function restaurantBlockTitle(role: string, place?: Place): string {
  if (place?.name?.trim()) return `${role} · ${place.name.trim()}`;
  return role;
}

function pushTransport(
  blocks: DraftBlock[],
  from: GeoPoint,
  to: GeoPoint,
  label: string,
): void {
  const meters = haversineMeters(from, to);
  const mins = estimateTravelMinutes(from, to);
  if (mins < 12 && meters < 600) {
    // Fold tiny walks into the next activity note instead of a separate card.
    return;
  }
  blocks.push({
    kind: 'logistics',
    title: `${travelModeLabel(meters)} · ${label}`,
    durationMin: mins,
    notes: `~${Math.round(meters / 100) / 10} km · ~${mins} min incl. walking/wait buffer. Check the route in Directions.`,
    feeLabel: 'Transit fare varies',
    feeAmount: 0,
  });
}

function materializeBlocks(
  day: string,
  startMin: number,
  blocks: DraftBlock[],
  currency: string,
): TripSuggestionItem[] {
  const items: TripSuggestionItem[] = [];
  let cursor = startMin;
  blocks.forEach((block, index) => {
    const startTime = minutesToTime(cursor);
    const endTime = minutesToTime(cursor + block.durationMin);
    const fee =
      block.feeLabel != null
        ? { amount: block.feeAmount ?? 0, feeLabel: block.feeLabel }
        : estimateRealisticFee(block.kind, block.place, currency);
    items.push({
      id: `${day}-${block.kind}-${index}`,
      kind: block.kind,
      title: block.title,
      startTime,
      endTime,
      notes: block.notes,
      estimatedCost: fee.amount,
      currency,
      feeLabel: block.roleLabel ? `${block.roleLabel} · ${fee.feeLabel}` : fee.feeLabel,
      placeId: block.place?.id,
      placeName: block.place?.name,
      latitude: block.place?.latitude,
      longitude: block.place?.longitude,
    });
    cursor += block.durationMin;
  });
  return items;
}

function dayRole(dayIndex: number, totalDays: number, hasThemeParkDay: boolean): DayRole {
  if (dayIndex === 0) return 'arrival';
  if (dayIndex === totalDays - 1 && totalDays > 1) return 'departure';
  if (hasThemeParkDay) return 'theme_park';
  return 'full';
}

function stylePace(style: SuggestionStyle): { maxAttractions: number; eveningLight: boolean } {
  if (style === 'relaxed') return { maxAttractions: 2, eveningLight: true };
  if (style === 'sightseeing') return { maxAttractions: 4, eveningLight: false };
  if (style === 'foodie') return { maxAttractions: 2, eveningLight: false };
  return { maxAttractions: 3, eveningLight: false };
}

export function buildRealisticItineraryDays(input: {
  days: string[];
  cityLabel: string;
  style: SuggestionStyle;
  currency: string;
  hotel: Place | null;
  attractions: Place[];
  restaurants: Place[];
  shopping: Place[];
  withKids?: boolean;
  companionNotes?: string;
  /** HH:MM — when the traveler lands / arrives on day 1. */
  arrivalTime?: string;
  /** HH:MM — target airport departure window on the last day. */
  departureTime?: string;
}): TripSuggestionDay[] {
  const withKids = Boolean(input.withKids);
  const pace = stylePace(input.style);
  const hotel = input.hotel;
  const hotelPoint = hotel
    ? pointOf(hotel)
    : input.attractions[0]
      ? pointOf(input.attractions[0])
      : { latitude: 0, longitude: 0 };
  const arrivalStartMin = parseTimeToMin(input.arrivalTime?.trim() || '08:00');
  const departureTargetMin = parseTimeToMin(input.departureTime?.trim() || '18:00');

  const startMinFittingEnd = (blocks: DraftBlock[], endTarget: number, fallback: number) => {
    const total = blocks.reduce((sum, block) => sum + block.durationMin, 0);
    return Math.max(6 * 60, Math.min(fallback, endTarget - total));
  };

  const themeParks = input.attractions.filter((p) => classifyVisit(p) === 'theme_park');
  const regular = input.attractions.filter((p) => classifyVisit(p) !== 'theme_park');
  const clusters = clusterNearbyPlaces(regular, 2_800, pace.maxAttractions + 1);

  const usedRestaurants = new Set<string>();
  const usedTheme = new Set<string>();
  let clusterCursor = 0;
  let themeDaysUsed = 0;

  const total = input.days.length;
  const midDays = Math.max(0, total - 2);
  // Keep ≥1 geographic sightseeing day when the trip is long enough.
  const maxThemeDays = Math.min(
    themeParks.length,
    Math.max(0, midDays - (total >= 4 ? 1 : 0)),
  );
  const preferredFirstThemeDay = total >= 4 ? Math.min(2, total - 2) : total >= 3 ? 1 : -1;

  return input.days.map((day, dayIndex) => {
    // Dedicated theme-park days only (never stack two parks on one day).
    const assignTheme =
      preferredFirstThemeDay >= 0 &&
      dayIndex > 0 &&
      dayIndex < total - 1 &&
      themeDaysUsed < maxThemeDays &&
      themeParks.some((p) => !usedTheme.has(p.id)) &&
      (dayIndex === preferredFirstThemeDay ||
        (dayIndex > preferredFirstThemeDay && (dayIndex - preferredFirstThemeDay) % 2 === 0));

    const role = dayRole(dayIndex, total, assignTheme);
    const blocks: DraftBlock[] = [];

    if (role === 'arrival') {
      // Realistic arrival — never sightseeing at aircraft door time.
      blocks.push({
        kind: 'logistics',
        title: `Arrive · ${input.cityLabel}`,
        durationMin: 15,
        notes:
          `${input.companionNotes ?? ''} On-block at ${input.arrivalTime?.trim() || 'scheduled arrival'}. Do not schedule sightseeing yet.`.trim(),
        feeLabel: 'Airport',
        roleLabel: 'Arrival',
      });
      blocks.push({
        kind: 'logistics',
        title: 'Immigration · baggage · customs',
        durationMin: 75,
        notes:
          'Allow ~60–90 min for international arrivals (queues vary). Domestic arrivals may be faster.',
        feeLabel: 'No fee',
        roleLabel: 'Airport process',
      });
      blocks.push({
        kind: 'logistics',
        title: 'Airport setup (eSIM / cash / transit card)',
        durationMin: 20,
        notes: 'Wi‑Fi, withdraw local currency if needed, buy/activate IC transit card.',
        feeLabel: 'Optional ATM / card fees',
        roleLabel: 'Setup',
      });
      blocks.push({
        kind: 'logistics',
        title: hotel
          ? `Transfer toward hotel (${hotel.name})`
          : 'Transfer toward city / hotel area',
        durationMin: 50,
        place: hotel ?? undefined,
        notes:
          'Airport → hotel. Check train/bus/taxi options in Directions. Far airports need longer.',
        feeLabel: 'Transit / taxi',
        roleLabel: 'Airport transfer',
      });
      if (hotel) {
        blocks.push({
          kind: 'hotel',
          title: `Luggage drop · ${hotel.name}`,
          durationMin: 20,
          place: hotel,
          notes:
            'If rooms are not ready, leave bags at reception and start a light nearby plan. Do not wait idle until 15:00 check-in.',
          feeLabel: 'Lodging',
          roleLabel: 'Hotel',
        });
      }

      // Nearby highlights + a well-rated lunch close to the hotel area.
      const lightCluster = clusters[clusterCursor++] ?? regular.slice(0, 3);
      const pickLights = (maxMeters: number, limit: number) =>
        [
          ...lightCluster.filter((place) => haversineMeters(hotelPoint, pointOf(place)) <= maxMeters),
          ...regular.filter((place) => haversineMeters(hotelPoint, pointOf(place)) <= maxMeters),
          ...input.shopping.filter((place) => haversineMeters(hotelPoint, pointOf(place)) <= maxMeters),
        ]
          .filter((place, index, all) => all.findIndex((p) => p.id === place.id) === index)
          .slice(0, limit);
      const lightLimit = withKids || input.style === 'relaxed' ? 1 : 2;
      const fallbackLights =
        pickLights(12_000, lightLimit).length > 0
          ? pickLights(12_000, lightLimit)
          : pickLights(35_000, lightLimit);
      let lastPoint = hotelPoint;
      for (const [i, place] of fallbackLights.entries()) {
        pushTransport(blocks, lastPoint, pointOf(place), `to ${place.name}`);
        const profile = classifyVisit(place);
        const dur = Math.min(visitDurationMinutes(profile, input.style, withKids), 90);
        const fee = estimateRealisticFee('attraction', place, input.currency);
        const km = (haversineMeters(hotelPoint, pointOf(place)) / 1000).toFixed(1);
        blocks.push({
          kind: 'attraction',
          title: place.name,
          durationMin: dur,
          place,
          notes: `Popular nearby stop (~${km} km). ${place.address ?? ''}`.trim(),
          feeAmount: fee.amount,
          feeLabel: fee.feeLabel,
          roleLabel: i === 0 ? 'Nearby highlight' : 'Nearby stop',
        });
        lastPoint = pointOf(place);
      }
      const lunch = pickRestaurantNear(input.restaurants, lastPoint, usedRestaurants, 5_000);
      if (lunch) {
        pushTransport(blocks, lastPoint, pointOf(lunch), `to lunch`);
        const fee = estimateRealisticFee('restaurant', lunch, input.currency);
        blocks.push({
          kind: 'restaurant',
          title: restaurantBlockTitle('Lunch', lunch),
          durationMin: visitDurationMinutes('meal', input.style, withKids),
          place: lunch,
          notes: [
            lunch.rating != null ? `${lunch.rating}★ nearby restaurant` : 'Well-rated nearby restaurant',
            lunch.address,
          ]
            .filter(Boolean)
            .join(' · '),
          feeAmount: fee.amount,
          feeLabel: fee.feeLabel,
          roleLabel: 'Lunch',
        });
        lastPoint = pointOf(lunch);
      }
      blocks.push({
        kind: 'hotel',
        title: hotel ? `Return · check-in / rest · ${hotel.name}` : 'Return to hotel · rest',
        durationMin: 40,
        place: hotel ?? undefined,
        notes: 'Arrival evenings should stay light. Save packed sightseeing for later days.',
        feeLabel: 'Lodging',
        roleLabel: 'Evening',
      });

      return {
        day,
        items: materializeBlocks(day, arrivalStartMin, blocks, input.currency),
      };
    }

    if (role === 'theme_park') {
      const park = themeParks.find((p) => !usedTheme.has(p.id)) ?? themeParks[0];
      if (park) {
        usedTheme.add(park.id);
        themeDaysUsed += 1;
        // Sibling parks (e.g. DisneySea) get their own full day later — never same day.

        const parkBreakfast = pickRestaurantNear(
          input.restaurants,
          hotelPoint,
          usedRestaurants,
          2_500,
        );
        blocks.push({
          kind: 'restaurant',
          title: restaurantBlockTitle('Breakfast', parkBreakfast),
          durationMin: 45,
          place: parkBreakfast,
          notes: parkBreakfast
            ? `Eat near the hotel before heading to ${park.name}.`
            : 'Eat before heading to the park.',
          roleLabel: 'Breakfast',
          ...(() => {
            const fee = estimateRealisticFee('restaurant', parkBreakfast, input.currency);
            return { feeAmount: fee.amount, feeLabel: fee.feeLabel };
          })(),
        });
        pushTransport(blocks, hotelPoint, pointOf(park), `to ${park.name}`);
        const fee = estimateRealisticFee('attraction', park, input.currency);
        blocks.push({
          kind: 'attraction',
          title: park.name,
          durationMin: visitDurationMinutes('theme_park', input.style, withKids),
          place: park,
          notes:
            'Full park day. Do not schedule other major attractions the same day. Lunch inside the park. Confirm ticket date/time & last admission.',
          feeAmount: fee.amount,
          feeLabel: fee.feeLabel,
          roleLabel: 'Theme park · full day',
        });
        pushTransport(blocks, pointOf(park), hotelPoint, 'return to hotel');
        blocks.push({
          kind: 'hotel',
          title: hotel ? `Return · ${hotel.name}` : 'Return to hotel',
          durationMin: 30,
          place: hotel ?? undefined,
          notes: 'Expect to be tired — keep evening optional.',
          feeLabel: 'Lodging',
          roleLabel: 'Evening',
        });
        return {
          day,
          items: materializeBlocks(day, parseTimeToMin('07:45'), blocks, input.currency),
        };
      }
    }

    if (role === 'departure') {
      const departureBreakfast = pickRestaurantNear(
        input.restaurants,
        hotelPoint,
        usedRestaurants,
        2_500,
      );
      blocks.push({
        kind: 'restaurant',
        title: restaurantBlockTitle('Breakfast', departureBreakfast),
        durationMin: 45,
        place: departureBreakfast,
        roleLabel: 'Breakfast',
        notes: departureBreakfast
          ? 'Quick breakfast near the hotel before check-out.'
          : 'Quick breakfast before check-out.',
        ...(() => {
          const fee = estimateRealisticFee('restaurant', departureBreakfast, input.currency);
          return { feeAmount: fee.amount, feeLabel: fee.feeLabel };
        })(),
      });
      if (hotel) {
        blocks.push({
          kind: 'hotel',
          title: `Check-out · ${hotel.name}`,
          durationMin: 30,
          place: hotel,
          notes: 'Pack, settle bills, store bags if you have a late flight.',
          feeLabel: 'Lodging',
          roleLabel: 'Check-out',
        });
      }
      const light = (clusters[clusterCursor++] ?? regular).slice(0, 1);
      let lastPoint = hotelPoint;
      for (const place of light) {
        if (classifyVisit(place) === 'theme_park') continue;
        pushTransport(blocks, lastPoint, pointOf(place), `to ${place.name}`);
        const fee = estimateRealisticFee('attraction', place, input.currency);
        blocks.push({
          kind: 'attraction',
          title: place.name,
          durationMin: 75,
          place,
          notes: 'Keep departure-day sightseeing light and close to your hotel/airport route.',
          feeAmount: fee.amount,
          feeLabel: fee.feeLabel,
          roleLabel: 'Light stop',
        });
        lastPoint = pointOf(place);
      }
      blocks.push({
        kind: 'logistics',
        title: 'Airport / departure transfer',
        durationMin: 90,
        notes:
          'Include check-in buffer + security/immigration for international flights (often 2–3h before departure).',
        feeLabel: 'Transit',
        roleLabel: 'Departure',
      });
      return {
        day,
        items: materializeBlocks(
          day,
          startMinFittingEnd(blocks, departureTargetMin, parseTimeToMin('07:30')),
          blocks,
          input.currency,
        ),
      };
    }

    // ——— Full sightseeing day: one geographic cluster morning + afternoon ———
    const cluster = clusters[clusterCursor++] ?? regular.slice(0, pace.maxAttractions);
    const places = cluster
      .filter((p) => classifyVisit(p) !== 'theme_park')
      .slice(0, pace.maxAttractions);

    const dayBreakfast = pickRestaurantNear(
      input.restaurants,
      hotelPoint,
      usedRestaurants,
      3_000,
    );
    blocks.push({
      kind: 'restaurant',
      title: restaurantBlockTitle('Breakfast', dayBreakfast),
      durationMin: input.style === 'relaxed' ? 60 : 45,
      place: dayBreakfast,
      roleLabel: 'Breakfast',
      notes: dayBreakfast
        ? `Start at a nearby spot (${dayBreakfast.rating != null ? `${dayBreakfast.rating}★` : 'local favorite'}) before the day’s neighborhood cluster.`
        : 'Start near the hotel before the day’s neighborhood cluster.',
      ...(() => {
        const fee = estimateRealisticFee('restaurant', dayBreakfast, input.currency);
        return { feeAmount: fee.amount, feeLabel: fee.feeLabel };
      })(),
    });

    let lastPoint = hotelPoint;
    const morningCount = Math.min(2, Math.ceil(places.length / 2) || 1);
    const morning = places.slice(0, morningCount);
    const afternoon = places.slice(morningCount);

    for (const [i, place] of morning.entries()) {
      pushTransport(blocks, lastPoint, pointOf(place), `to ${place.name}`);
      const profile = classifyVisit(place);
      const fee = estimateRealisticFee('attraction', place, input.currency);
      blocks.push({
        kind: place.category === 'shopping' || place.category === 'market' ? 'shopping' : 'attraction',
        title: place.name,
        durationMin: visitDurationMinutes(profile, input.style, withKids),
        place,
        notes: [
          place.rating != null ? `${place.rating}★ popular nearby` : 'Popular nearby stop',
          place.address,
          profile === 'major' ? 'Major stop — protect enough time; do not rush to a far district next.' : null,
          /sky|observation|tower|disney|universal|teamlab|ghibli/i.test(place.name)
            ? 'Reservation / timed entry may be required — confirm availability.'
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
        feeAmount: fee.amount,
        feeLabel: fee.feeLabel,
        roleLabel: i === 0 ? 'Morning highlight' : 'Nearby morning stop',
      });
      lastPoint = pointOf(place);
    }

    const lunch = pickRestaurantNear(input.restaurants, lastPoint, usedRestaurants);
    if (lunch) {
      pushTransport(blocks, lastPoint, pointOf(lunch), 'to lunch');
      const fee = estimateRealisticFee('restaurant', lunch, input.currency);
      blocks.push({
        kind: 'restaurant',
        title: restaurantBlockTitle('Lunch', lunch),
        durationMin: visitDurationMinutes('meal', input.style, withKids),
        place: lunch,
        notes: [
          lunch.rating != null ? `${lunch.rating}★ near the morning stops` : 'Lunch near the morning cluster',
          lunch.address,
        ]
          .filter(Boolean)
          .join(' · '),
        feeAmount: fee.amount,
        feeLabel: fee.feeLabel,
        roleLabel: 'Lunch',
      });
      lastPoint = pointOf(lunch);
    }

    for (const [i, place] of afternoon.entries()) {
      pushTransport(blocks, lastPoint, pointOf(place), `to ${place.name}`);
      const profile = classifyVisit(place);
      const fee = estimateRealisticFee('attraction', place, input.currency);
      blocks.push({
        kind: place.category === 'shopping' || place.category === 'market' ? 'shopping' : 'attraction',
        title: place.name,
        durationMin: visitDurationMinutes(profile, input.style, withKids),
        place,
        notes: [
          place.rating != null ? `${place.rating}★` : null,
          place.address,
        ]
          .filter(Boolean)
          .join(' · '),
        feeAmount: fee.amount,
        feeLabel: fee.feeLabel,
        roleLabel: i === 0 ? 'Afternoon highlight' : 'Nearby afternoon stop',
      });
      lastPoint = pointOf(place);
    }

    if (input.style === 'foodie' || !pace.eveningLight) {
      const dinner = pickRestaurantNear(input.restaurants, lastPoint, usedRestaurants, 4_000);
      if (dinner) {
        pushTransport(blocks, lastPoint, pointOf(dinner), 'to dinner');
        const fee = estimateRealisticFee('restaurant', dinner, input.currency);
        blocks.push({
          kind: 'restaurant',
          title: restaurantBlockTitle('Dinner', dinner),
          durationMin: 80,
          place: dinner,
          notes: [
            dinner.rating != null ? `${dinner.rating}★ nearby dinner` : 'Well-rated nearby dinner',
            dinner.address,
          ]
            .filter(Boolean)
            .join(' · '),
          feeAmount: fee.amount,
          feeLabel: fee.feeLabel,
          roleLabel: 'Dinner',
        });
        lastPoint = pointOf(dinner);
      }
    }

    pushTransport(blocks, lastPoint, hotelPoint, 'return to hotel');
    blocks.push({
      kind: 'hotel',
      title: hotel ? `Return · ${hotel.name}` : 'Return to hotel',
      durationMin: 25,
      place: hotel ?? undefined,
      notes: 'Wind down. Keep late-night add-ons optional.',
      feeLabel: 'Lodging',
      roleLabel: 'Evening',
    });

    return {
      day,
      items: materializeBlocks(day, parseTimeToMin('08:00'), blocks, input.currency),
    };
  });
}
