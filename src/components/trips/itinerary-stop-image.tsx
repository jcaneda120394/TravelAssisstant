import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Image } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import {
  buildFallbackTravelImage,
  getTravelImage,
  parseCityCountryFromAddress,
} from '@/lib/images';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  title: string;
  placeId?: string | null;
  addressHint?: string | null;
  kind?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * Thumbnail for itinerary stops — uses central getTravelImage (not AI-invented URLs).
 * Query key is stable per stop (no shared exclude list) so siblings don’t re-fetch forever.
 */
export function ItineraryStopImage({
  title,
  addressHint,
  kind,
  latitude,
  longitude,
}: Props) {
  const scheme = useAppColorScheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const parsed = parseCityCountryFromAddress(addressHint);
  const query = useQuery({
    queryKey: [
      'itinerary-stop-image',
      'v2',
      title,
      parsed.city,
      parsed.country,
      kind,
      latitude ?? null,
      longitude ?? null,
    ],
    queryFn: () =>
      getTravelImage({
        name: title,
        city: parsed.city,
        country: parsed.country,
        type: kind || 'activity',
        latitude,
        longitude,
      }),
    staleTime: 45 * 60_000,
    gcTime: 2 * 60 * 60_000,
  });

  const fallback = buildFallbackTravelImage(
    {
      name: title,
      city: parsed.city,
      country: parsed.country,
      type: kind || 'activity',
      latitude,
      longitude,
    },
    title,
  );

  const resolvedUri = query.data?.thumbnailUrl ?? query.data?.url ?? null;
  const uri =
    resolvedUri && resolvedUri !== failedUri ? resolvedUri : fallback.url;
  const skeleton = scheme === 'dark' ? 'bg-brand-900' : 'bg-surface-mist';

  return (
    <View className={`mb-2 overflow-hidden rounded-xl ${skeleton}`} style={{ height: 120 }}>
      <Image
        source={{ uri }}
        style={{ width: '100%', height: 120 }}
        resizeMode="cover"
        accessibilityLabel={query.data?.alt ?? title}
        onError={() => {
          if (uri !== fallback.url) {
            setFailedUri(uri);
          }
        }}
      />
      {env.appEnv !== 'production' && query.data?.provider ? (
        <AppText muted className="absolute bottom-1 right-2 text-[10px]">
          {query.data.provider}
        </AppText>
      ) : null}
    </View>
  );
}
