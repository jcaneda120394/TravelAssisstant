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

function countryTokens(label?: string | null): string {
  return (label ?? '').toLowerCase();
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
    const haystack = `${place.name} ${place.address ?? ''}`.toLowerCase();

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
      const travelerInPh = /philippine|manila|sorsogon|bulacan|cebu|davao|legazpi/.test(label);
      const placeInPh = /philippine|manila|sorsogon|bulacan|cebu|davao|legazpi|albay|gubat|donsol|barcelona, sorsogon/.test(
        address,
      );
      if (travelerInPh && address.includes('tokyo')) return false;
      if (travelerInPh && /japan|tokyo|shibuya/.test(address) && !placeInPh) return false;
      if (/japan|tokyo/.test(label) && placeInPh) return false;
    }

    return true;
  });
}
