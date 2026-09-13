import { fetchJson } from '@/lib/http/fetch-json';
import { labelize } from '@/constants/preferences';
import type { Place } from '@/types/domain';
import { formatDistanceMeters } from '@/utils/format';
import {
  estimatePlacePrice,
  type PlacePriceEstimate,
} from '@/utils/place-price-estimate';
import { displayOpeningHours, displayPlaceName } from '@/utils/place-name';

export type PlaceQuickFact = {
  label: string;
  value: string;
};

export type PlaceOverview = {
  title: string;
  /** e.g. "Beach in Barcelona, Sorsogon" */
  locationLine: string;
  summary: string;
  summarySource: 'place' | 'wikipedia' | 'generated';
  facts: PlaceQuickFact[];
  thumbUrl?: string;
};

type WikiSummaryResponse = {
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  description?: string;
  type?: string;
};

function cleanName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cityFromAddress(address?: string): string | null {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const STREETISH =
    /^(phố|pho\b|street|st\.|road|rd\.|avenue|ave\.|lane|đường|duong|hang |tong |alley)/i;
  if (parts.length === 1) return parts[0]!;
  const beforeCountry = parts.slice(0, -1).filter((p) => !STREETISH.test(p));
  const city = beforeCountry[beforeCountry.length - 1] ?? parts[0]!;
  return city.replace(/^thành phố\s+/i, '').replace(/^tp\.?\s+/i, '').trim();
}

function isFoodOrStay(place: Place): boolean {
  return /^(restaurant|cafe|bakery|hotel|resort|nightlife)$/.test(place.category);
}

function regionLine(place: Place): string {
  const city = cityFromAddress(place.address);
  const category = labelize(place.category);
  if (city) return `${category} in ${city}`;
  if (place.address) return `${category} · ${place.address}`;
  return category;
}

function generatedSummary(place: Place): string {
  const title = displayPlaceName(place);
  const city = cityFromAddress(place.address) ?? place.address ?? 'this area';
  const category = labelize(place.category);
  const tags = (place.tags ?? [])
    .filter((tag) => !/^(house|yes|no|building|residential|famous|local|underrated)$/i.test(tag))
    .slice(0, 3)
    .map(labelize);

  if (place.category === 'restaurant' || place.category === 'cafe' || place.category === 'bakery') {
    const cuisine = place.cuisine
      ? place.cuisine
          .split(';')
          .map((part) => labelize(part.trim()))
          .join(', ')
      : 'local food';
    return `${title} is a ${category.toLowerCase()} in ${city} known for ${cuisine}. Check hours and prices on site before you go.`;
  }

  if (place.category === 'hotel' || place.category === 'resort') {
    return `${title} is a ${category.toLowerCase()} in ${city}. Use it as a base for exploring nearby attractions, food, and transit.`;
  }

  const tagBit = tags.length ? ` Highlights include ${tags.join(', ')}.` : '';
  return `${title} is a popular ${category.toLowerCase()} near ${city}.${tagBit} Review hours, fees, and directions below before visiting.`;
}

async function wikipediaSummary(place: Place): Promise<{
  extract: string;
  thumbUrl?: string;
} | null> {
  // Small businesses rarely have Wikipedia pages — searching "Vietnam … Coffee"
  // matches dishes (Pho) or memorials. Prefer generated copy instead.
  if (isFoodOrStay(place)) {
    return null;
  }

  const name = cleanName(displayPlaceName(place));
  const city = cityFromAddress(place.address);
  const searchQuery = [name, city].filter(Boolean).join(' ').trim();
  if (searchQuery.length < 3) return null;

  const stop = new Set([
    'the',
    'and',
    'vietnam',
    'japan',
    'philippines',
    'city',
    'town',
    'speciality',
    'specialty',
  ]);
  const distinctive = name
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 4 && !stop.has(t));

  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=5&format=json&origin=*` +
      `&srsearch=${encodeURIComponent(`"${name}" ${city ?? ''}`.trim())}`;
    const search = await fetchJson<{
      query?: { search?: Array<{ title?: string; snippet?: string }> };
    }>(searchUrl, {
      timeoutMs: 7_000,
      cacheTtlMs: 60 * 60_000,
      headers: { Accept: 'application/json' },
    });

    const titles = (search.query?.search ?? [])
      .map((row) => row.title?.trim())
      .filter((title): title is string => Boolean(title));

    const candidates = [
      ...titles,
      city ? `${name} ${city}` : '',
      name,
    ].filter((title, index, arr) => title.length >= 3 && arr.indexOf(title) === index);

    for (const title of candidates) {
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          title.replace(/ /g, '_'),
        )}`;
        const data = await fetchJson<WikiSummaryResponse>(url, {
          timeoutMs: 7_000,
          cacheTtlMs: 60 * 60_000,
          headers: { Accept: 'application/json' },
        });
        if (data.type === 'disambiguation') continue;
        const extract = data.extract?.trim();
        if (!extract || extract.length < 40) continue;

        const hay = `${data.title ?? ''} ${extract}`.toLowerCase();
        // Reject food-dish articles and weak country-only matches.
        if (/\b(soup|noodle|dish consisting|cuisine of)\b/i.test(hay) && distinctive.length) {
          const titleHits = distinctive.filter((t) => (data.title ?? '').toLowerCase().includes(t));
          if (titleHits.length === 0) continue;
        }

        const hit = distinctive.filter((t) => hay.includes(t)).length;
        if (distinctive.length >= 2 && hit < 2) continue;
        if (distinctive.length === 1 && hit < 1) continue;
        if (distinctive.length === 0) continue;

        return {
          extract: extract.length > 420 ? `${extract.slice(0, 417).trim()}…` : extract,
          thumbUrl: data.thumbnail?.source,
        };
      } catch {
        // Try next candidate.
      }
    }
  } catch {
    // Fall through to generated summary.
  }
  return null;
}

function buildFacts(
  place: Place,
  price: PlacePriceEstimate | null,
): PlaceQuickFact[] {
  const facts: PlaceQuickFact[] = [];

  if (place.address) {
    facts.push({ label: 'Location', value: place.address });
  }
  if (place.distanceMeters != null) {
    facts.push({ label: 'Distance', value: formatDistanceMeters(place.distanceMeters) });
  }

  const hours = displayOpeningHours(place.openingHours);
  if (hours && !/^hours not listed$/i.test(hours)) {
    facts.push({ label: 'Hours', value: hours });
  }

  if (price?.label) {
    const feeLabel =
      price.unit === 'ticket' || price.unit === 'pass' || price.unit === 'visit'
        ? 'Entrance / fee'
        : price.unit === 'meal'
          ? 'Est. meal'
          : price.unit === 'night'
            ? 'Est. stay'
            : price.unit === 'free'
              ? 'Entry'
              : 'Price';
    facts.push({ label: feeLabel, value: price.label });
  }

  if (place.cuisine) {
    facts.push({
      label: 'Cuisine',
      value: place.cuisine
        .split(';')
        .map((part) => labelize(part.trim()))
        .join(', '),
    });
  }

  if (place.rating != null) {
    const reviews =
      place.reviewCount != null ? ` (${place.reviewCount.toLocaleString()} reviews)` : '';
    facts.push({ label: 'Rating', value: `${place.rating.toFixed(1)}★${reviews}` });
  }

  if (place.phone) {
    facts.push({ label: 'Phone', value: place.phone });
  }
  if (place.website) {
    facts.push({ label: 'Website', value: place.website });
  }
  if (place.menuUrl) {
    facts.push({ label: 'Menu', value: place.menuUrl });
  }

  const tags = (place.tags ?? [])
    .filter((tag) => !/^(house|yes|no|building|residential|famous|local|underrated)$/i.test(tag))
    .slice(0, 6)
    .map(labelize);
  if (tags.length) {
    facts.push({ label: 'Good for', value: tags.join(' · ') });
  }

  return facts;
}

/**
 * Google-style place overview: short summary + quick visitor facts.
 * Uses Wikipedia when available; otherwise builds a clear local summary.
 */
export async function getPlaceOverview(
  place: Place,
  options?: { currency?: string; budgetTier?: string | null; thumbUrl?: string },
): Promise<PlaceOverview> {
  const title = displayPlaceName(place);
  const price = estimatePlacePrice(
    place,
    options?.currency ?? 'USD',
    options?.budgetTier ?? null,
  );
  const facts = buildFacts(place, price);

  if (place.description && place.description.trim().length >= 40) {
    return {
      title,
      locationLine: regionLine(place),
      summary: place.description.trim(),
      summarySource: 'place',
      facts,
      thumbUrl: options?.thumbUrl,
    };
  }

  const wiki = await wikipediaSummary(place);
  if (wiki) {
    return {
      title,
      locationLine: regionLine(place),
      summary: wiki.extract,
      summarySource: 'wikipedia',
      facts,
      thumbUrl: options?.thumbUrl ?? wiki.thumbUrl,
    };
  }

  return {
    title,
    locationLine: regionLine(place),
    summary: generatedSummary(place),
    summarySource: 'generated',
    facts,
    thumbUrl: options?.thumbUrl,
  };
}
