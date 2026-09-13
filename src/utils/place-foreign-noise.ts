import type { Place } from '@/types/domain';

/** Famous tokens that must not appear outside their home region. */
const REGION_LANDMARKS: Array<{ region: RegExp; hint: RegExp }> = [
  {
    region: /tokyo|shibuya|shinjuku|harajuku|osaka|kyoto|japan/,
    hint: /\b(shibuya|dogenzaka|shinjuku|harajuku|asakusa|akihabara|ginza|meiji jingu|tokyo tower|shibuya sky|ichiran|takeshita|senso-?ji|skytree)\b/i,
  },
  {
    region: /\b(spain|barcelona(?!,?\s*sorsogon)|madrid|catalonia|catalunya)\b/,
    hint: /\b(sagrada|park güell|park guell|la rambla|casa batll[oó]|gothic quarter)\b/i,
  },
  {
    region: /\b(france|paris)\b/,
    hint: /\b(eiffel|louvre|notre-?dame|champs[ -]?Élysées|champs elysees|montmartre)\b/i,
  },
  {
    region: /\b(uae|dubai|abu dhabi)\b/,
    hint: /\b(burj khalifa|palm jumeirah|dubai mall|sheikh zayed)\b/i,
  },
  {
    region: /\b(usa|united states|new york|california)\b/,
    hint: /\b(times square|central park|golden gate|statue of liberty|disneyland california)\b/i,
  },
];

/**
 * Same-country but wrong metro/province — e.g. Bulacan traveler must not see Intramuros (Manila)
 * even when haversine distance is only ~25 km.
 */
const LOCAL_AREA_GATES: Array<{ traveler: RegExp; foreignPlace: RegExp }> = [
  {
    traveler:
      /\b(bulacan|san jose del monte|sjdm|malolos|meycauayan|marilao|bocaue|santa maria|norzagaray|guiguinto|plaridel|baliuag|hagonoy|obando|doña remedios|dona remedios|sapang palay|villa belissa)\b/i,
    foreignPlace:
      /\b(manila|intramuros|quezon city|makati|pasig|taguig|pasay|mandaluyong|san juan|caloocan|navotas|malabon|valenzuela|parañaque|paranaque|las piñas|las pinas|muntinlupa|pateros|binondo|ermita|malate|quiapo|rizal park|bonifacio global|\bbgc\b|ortigas|alabang|makati cbd|roxas boulevard)\b/i,
  },
  {
    traveler: /\b(cebu|mandaue|lapu-?lapu|talisay)\b/i,
    foreignPlace: /\b(\bmanila\b|quezon city|makati|davao city|intramuros)\b/i,
  },
  {
    traveler: /\b(davao)\b/i,
    foreignPlace: /\b(\bmanila\b|quezon city|makati|cebu city|intramuros)\b/i,
  },
  {
    traveler: /\b(tokyo|shibuya|shinjuku|osaka|kyoto)\b/i,
    foreignPlace: /\b(manila|bulacan|hong kong|seoul|bangkok)\b/i,
  },
];

/** Rough Metro Manila box — used when traveler is in Bulacan and OSM omits city in the address. */
const METRO_MANILA_BOX = {
  minLat: 14.35,
  maxLat: 14.705,
  minLon: 120.9,
  maxLon: 121.14,
};

const BULACAN_TRAVELER =
  /\b(bulacan|san jose del monte|sjdm|malolos|meycauayan|marilao|bocaue|santa maria|norzagaray|guiguinto|plaridel|baliuag|hagonoy|obando|doña remedios|dona remedios|sapang palay|villa belissa)\b/i;

function countryTokens(label?: string | null): string {
  return (label ?? '').toLowerCase();
}

function placeHaystack(place: Place): string {
  return `${place.name} ${place.address ?? ''} ${(place.tags ?? []).join(' ')}`.toLowerCase();
}

function inMetroManilaBox(place: Place): boolean {
  const { latitude: lat, longitude: lon } = place;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return (
    lat >= METRO_MANILA_BOX.minLat &&
    lat <= METRO_MANILA_BOX.maxLat &&
    lon >= METRO_MANILA_BOX.minLon &&
    lon <= METRO_MANILA_BOX.maxLon
  );
}

/** True when the place clearly belongs to a conflicting metro/province. */
export function isOutOfTravelerArea(place: Place, cityLabel?: string | null): boolean {
  const label = countryTokens(cityLabel);
  if (!label) return false;
  const haystack = placeHaystack(place);

  for (const { traveler, foreignPlace } of LOCAL_AREA_GATES) {
    if (!traveler.test(label)) continue;
    // Place is still local if its address/name also matches the traveler area.
    if (traveler.test(haystack)) continue;
    if (foreignPlace.test(haystack)) return true;
  }

  // Bulacan / SJDM: drop unlabeled Metro Manila coordinates (Intramuros, Rizal Park, …).
  if (BULACAN_TRAVELER.test(label) && !BULACAN_TRAVELER.test(haystack) && inMetroManilaBox(place)) {
    return true;
  }

  return false;
}

/**
 * Drop curated/demo rows that belong to another famous city/country
 * when the traveler's location label is elsewhere (extra safety beyond haversine).
 */
export function dropForeignLandmarkNoise(
  places: Place[],
  cityLabel?: string | null,
): Place[] {
  const label = countryTokens(cityLabel);

  return places.filter((place) => {
    if (isOutOfTravelerArea(place, cityLabel)) return false;

    const haystack = placeHaystack(place);

    for (const { region, hint } of REGION_LANDMARKS) {
      const placeLooksForeign = hint.test(haystack);
      if (!placeLooksForeign) continue;
      // Keep landmark if traveler is already in that region.
      if (region.test(label)) continue;
      // Also keep if the place address itself is clearly local to the traveler label country.
      if (label && haystack.includes(label.split(',')[0]?.trim() ?? '')) continue;
      return false;
    }

    // World-catalog rows whose address country conflicts with traveler country.
    if (place.provider === 'world-catalog' && label.length > 3) {
      const address = (place.address ?? '').toLowerCase();
      if (!address) return true;
      const travelerInPh =
        /philippine|manila|sorsogon|bulacan|cebu|davao|legazpi|san jose del monte/.test(label);
      const placeInPh =
        /philippine|manila|sorsogon|bulacan|cebu|davao|legazpi|albay|gubat|donsol|barcelona, sorsogon|san jose del monte/.test(
          address,
        );
      if (travelerInPh && address.includes('tokyo')) return false;
      if (travelerInPh && /japan|tokyo|shibuya/.test(address) && !placeInPh) return false;
      if (/japan|tokyo/.test(label) && placeInPh) return false;
    }

    return true;
  });
}
