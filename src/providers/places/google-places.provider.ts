import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import type {
  NearbyPlacesParams,
  PlacesProvider,
  SearchPlacesParams,
} from '@/providers/places/places.provider';
import type { Place, PlaceCategory } from '@/types/domain';
import { filterPlacesWithinRadius } from '@/utils/geo';

type GooglePlacesResponse = {
  places?: Place[];
  place?: Place | null;
  photo?: { url?: string; thumbUrl?: string; title?: string } | null;
  error?: string;
  code?: string;
};

async function invokeGooglePlaces(body: Record<string, unknown>): Promise<GooglePlacesResponse | null> {
  if (!env.isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke<GooglePlacesResponse>('google-places', {
      body,
    });
    if (error) return null;
    if (data?.code === 'NO_GOOGLE_KEY' || data?.error === 'Google Places is not configured') {
      return null;
    }
    return data ?? null;
  } catch {
    return null;
  }
}

function asPlace(raw: Place): Place {
  return {
    ...raw,
    id: raw.id?.startsWith('google-') ? raw.id : `google-${raw.providerPlaceId || raw.id}`,
    provider: 'google',
    category: (raw.category as PlaceCategory) || 'attraction',
  };
}

/**
 * Live Google Places (New) via Edge Function — used for every search surface
 * (Search screen, Home, Explore, Map, trips, AI) when a server key is configured.
 */
export class GooglePlacesProvider implements PlacesProvider {
  readonly name = 'google-places';

  async searchPlaces(params: SearchPlacesParams): Promise<Place[]> {
    const data = await invokeGooglePlaces({
      action: 'search',
      query: params.query,
      latitude: params.location?.latitude,
      longitude: params.location?.longitude,
      limit: params.limit ?? 12,
    });
    return (data?.places ?? []).map(asPlace);
  }

  async getNearbyPlaces(params: NearbyPlacesParams): Promise<Place[]> {
    const data = await invokeGooglePlaces({
      action: 'nearby',
      latitude: params.location.latitude,
      longitude: params.location.longitude,
      radiusMeters: params.radiusMeters,
      category: params.category,
      cityLabel: params.cityLabel,
      limit: Math.min(params.limit ?? 20, 20),
    });
    let places = (data?.places ?? []).map(asPlace);
    if (params.query) {
      const q = params.query.toLowerCase();
      places = places.filter((p) => p.name.toLowerCase().includes(q));
    }
    return filterPlacesWithinRadius(places, params.location, params.radiusMeters, 250);
  }

  async getPlaceDetails(placeId: string): Promise<Place | null> {
    const id = placeId.replace(/^google-/, '');
    const data = await invokeGooglePlaces({
      action: 'details',
      placeId: id,
    });
    return data?.place ? asPlace(data.place) : null;
  }

  async getPlacePhotos(placeId: string): Promise<string[]> {
    const details = await this.getPlaceDetails(placeId);
    return details?.photos ?? [];
  }
}

/** True when the Edge Function is configured (does not prove the Google key works). */
export function isGooglePlacesClientReady(): boolean {
  return Boolean(env.isSupabaseConfigured && supabase);
}
