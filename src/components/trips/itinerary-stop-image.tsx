import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Image } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { getTravelImage, parseCityCountryFromAddress } from '@/lib/images';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  title: string;
  placeId?: string | null;
  addressHint?: string | null;
  kind?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  excludeImageUrls?: string[];
  onImageLoaded?: (url: string) => void;
};

/**
 * Thumbnail for itinerary stops — uses central getTravelImage (not AI-invented URLs).
 */
export function ItineraryStopImage({
  title,
  addressHint,
  kind,
  latitude,
  longitude,
  excludeImageUrls,
  onImageLoaded,
}: Props) {
  const scheme = useAppColorScheme();
  const parsed = parseCityCountryFromAddress(addressHint);
  const query = useQuery({
    queryKey: [
      'itinerary-stop-image',
      'v1',
      title,
      parsed.city,
      parsed.country,
      kind,
      (excludeImageUrls ?? []).slice(0, 6).join('|'),
    ],
    queryFn: () =>
      getTravelImage({
        name: title,
        city: parsed.city,
        country: parsed.country,
        type: kind || 'activity',
        latitude,
        longitude,
        excludeImageUrls,
      }),
    staleTime: 45 * 60_000,
  });

  useEffect(() => {
    const url = query.data?.url;
    if (url && query.data?.provider !== 'fallback') {
      onImageLoaded?.(url);
    }
  }, [query.data?.url, query.data?.provider, onImageLoaded]);

  const uri = query.data?.thumbnailUrl ?? query.data?.url;
  const skeleton = scheme === 'dark' ? 'bg-brand-900' : 'bg-surface-mist';

  return (
    <View className={`mb-2 overflow-hidden rounded-xl ${skeleton}`} style={{ height: 120 }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: 120 }}
          resizeMode="cover"
          accessibilityLabel={query.data?.alt ?? title}
        />
      ) : (
        <View className="h-full items-center justify-center">
          <AppText muted className="text-xs">
            {query.isLoading ? 'Loading photo…' : 'Photo'}
          </AppText>
        </View>
      )}
      {env.appEnv !== 'production' && query.data?.provider ? (
        <AppText muted className="absolute bottom-1 right-2 text-[10px]">
          {query.data.provider}
        </AppText>
      ) : null}
    </View>
  );
}
