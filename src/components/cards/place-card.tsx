import { memo, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import type { Place } from '@/types/domain';
import { labelize } from '@/constants/preferences';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { rememberPlace } from '@/services/places/place-cache';
import { fetchBestPlacePhoto } from '@/services/places/place-photos.service';
import { formatDistanceMeters } from '@/utils/format';
import {
  estimatePlacePrice,
  formatPlaceRating,
} from '@/utils/place-price-estimate';
import { displayPlaceName } from '@/utils/place-name';

/** ~4:3 photo-first listing height (industry marketplace rhythm). */
const PHOTO_HEIGHT = 188;

function PlaceCardPhoto({ place }: { place: Place }) {
  const scheme = useAppColorScheme();
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const title = displayPlaceName(place);
  const photoQuery = useQuery({
    queryKey: ['place-card-photo', 'v6-world', place.id, place.name, place.address],
    queryFn: () => fetchBestPlacePhoto(place),
    staleTime: 45 * 60_000,
    gcTime: 2 * 60 * 60_000,
  });

  const candidates = useMemo(() => {
    const data = photoQuery.data;
    if (!data) return [] as string[];
    return [...new Set([data.thumbUrl, data.url].filter((u): u is string => Boolean(u)))];
  }, [photoQuery.data]);

  const uri = candidates.find((u) => !failedUrls.has(u)) ?? null;
  const skeletonClass = scheme === 'dark' ? 'bg-brand-900' : 'bg-surface-mist';
  const initial = (title.trim().charAt(0) || '?').toUpperCase();

  return (
    <View className={`w-full overflow-hidden rounded-2xl ${skeletonClass}`} style={{ height: PHOTO_HEIGHT }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: PHOTO_HEIGHT }}
          resizeMode="cover"
          accessibilityLabel={`${title} photo`}
          onError={() =>
            setFailedUrls((prev) => {
              const next = new Set(prev);
              next.add(uri);
              return next;
            })
          }
        />
      ) : (
        <View className={`h-full w-full items-center justify-center ${skeletonClass}`}>
          {photoQuery.isLoading ? (
            <AppText muted className="text-xs">
              Loading photo…
            </AppText>
          ) : (
            <>
              <AppText className="text-3xl font-sans-semibold opacity-40">{initial}</AppText>
              <AppText muted className="mt-1 text-xs capitalize">
                {labelize(place.category)}
              </AppText>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function PlaceCardComponent({
  place,
  className = '',
}: {
  place: Place;
  className?: string;
}) {
  const router = useRouter();
  const { currency, budgetTier } = useDisplayCurrency();
  const title = displayPlaceName(place);
  const ratingText = formatPlaceRating(place);
  const price = estimatePlacePrice(place, currency, budgetTier);

  return (
    <Pressable
      testID={`place-card-${place.id}`}
      onPress={() => {
        rememberPlace(place);
        router.push({
          pathname: '/place/[id]',
          params: {
            id: place.id,
            snapshot: JSON.stringify(place),
          },
        });
      }}
      className={`bg-transparent ${className || 'mb-5'}`}
    >
      <PlaceCardPhoto place={place} />
      <View className="mt-2.5 px-0.5">
        <View className="flex-row items-start justify-between gap-2">
          <AppText className="flex-1 font-sans-semibold text-[15px] leading-5" numberOfLines={1}>
            {title}
          </AppText>
          {ratingText ? (
            <AppText className="text-[13px] font-sans-medium">{ratingText}</AppText>
          ) : null}
        </View>

        <View className="mt-1 flex-row flex-wrap items-center gap-x-2">
          <AppText muted className="text-[13px] capitalize">
            {labelize(place.category)}
          </AppText>
          {place.distanceMeters != null ? (
            <AppText muted className="text-[13px]">
              · {formatDistanceMeters(place.distanceMeters)}
            </AppText>
          ) : null}
        </View>

        {price ? (
          <AppText className="mt-1 text-[14px] font-sans-semibold text-ink-light dark:text-ink-dark">
            {price.label}
          </AppText>
        ) : null}

        {place.address ? (
          <AppText muted className="mt-0.5 text-[13px] leading-4" numberOfLines={1}>
            {place.address}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

export const PlaceCard = memo(PlaceCardComponent);
