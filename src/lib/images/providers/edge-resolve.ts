import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import type { GetTravelImageInput, TravelImage } from '@/lib/images/types';
import { buildImageQueryLadder } from '@/lib/images/image-query-builder';

type EdgePayload = {
  success?: boolean;
  image?: TravelImage | null;
  providerTried?: string[];
  error?: string;
};

/**
 * Server-side sequential resolve: Pexels → Unsplash → Openverse → Wikimedia.
 * API keys stay on Supabase Edge (never EXPO_PUBLIC).
 */
export async function resolveTravelImageViaEdge(
  input: GetTravelImageInput,
): Promise<TravelImage | null> {
  if (!env.isSupabaseConfigured || !supabase) return null;

  const queries = buildImageQueryLadder(input);
  try {
    const { data, error } = await supabase.functions.invoke<EdgePayload>('stock-photos', {
      body: {
        action: 'resolve',
        name: input.name,
        city: input.city ?? null,
        country: input.country ?? null,
        type: input.type ?? null,
        queries,
        excludeImageUrls: input.excludeImageUrls ?? [],
        excludeImageIds: input.excludeImageIds ?? [],
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });
    if (error || !data?.image?.url) return null;
    return data.image;
  } catch {
    return null;
  }
}
