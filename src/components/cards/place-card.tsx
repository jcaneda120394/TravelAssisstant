import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import type { Place, PlaceCategory } from '@/types/domain';
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

const CATEGORY_BAR: Partial<Record<PlaceCategory, string>> = {
  restaurant: 'bg-accent-500',
  cafe: 'bg-accent-400',
  bakery: 'bg-accent-300',
  attraction: 'bg-brand-500',
  park: 'bg-brand-400',
  museum: 'bg-sky-500',
  temple: 'bg-accent-600',
  hotel: 'bg-sky-600',
  nightlife: 'bg-accent-600',
  shopping: 'bg-sky-500',
  mall: 'bg-sky-500',
  market: 'bg-sky-400',
  convenience: 'bg-emerald-500',
  souvenir: 'bg-pink-500',
  beach: 'bg-sky-400',
  pharmacy: 'bg-rose-500',
  atm: 'bg-lime-600',
  bank: 'bg-lime-700',
  transit_station: 'bg-indigo-500',
  airport: 'bg-indigo-600',
  bicycle_rental: 'bg-teal-500',
  post_office: 'bg-violet-500',
};

const PHOTO_HEIGHT = 148;

function PlaceCardPhoto({ place }: { place: Place }) {
  const scheme = useAppColorScheme();
  const [failed, setFailed] = useState(false);
  const photoQuery = useQuery({
    queryKey: ['place-card-photo', place.id, place.name],
    queryFn: () => fetchBestPlacePhoto(place),
    staleTime: 45 * 60_000,
    gcTime: 2 * 60 * 60_000,
  });

  const uri = failed ? undefined : photoQuery.data?.thumbUrl ?? photoQuery.data?.url;
  const skeletonClass = scheme === 'dark' ? 'bg-brand-900' : 'bg-brand-100';

  return (
    <View className={`w-full overflow-hidden ${skeletonClass}`} style={{ height: PHOTO_HEIGHT }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: PHOTO_HEIGHT }}
          resizeMode="cover"
          accessibilityLabel={`${displayPlaceName(place)} photo`}
          onError={() => setFailed(true)}
        />
      ) : (
        <View className={`h-full w-full items-center justify-center ${skeletonClass}`}>
          <AppText muted className="text-xs">
            {photoQuery.isLoading ? 'Loading photo…' : 'No photo'}
          </AppText>
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
  const scheme = useAppColorScheme();
  const { currency, budgetTier } = useDisplayCurrency();
  const title = displayPlaceName(place);
  const bar = CATEGORY_BAR[place.category] ?? 'bg-brand-500';
  const ratingText = formatPlaceRating(place);
  const price = estimatePlacePrice(place, currency, budgetTier);
  const tags = Array.from(
    new Map(
      (place.tags ?? [])
        .filter((tag) => tag.toLowerCase() !== place.category.toLowerCase())
        .map((tag) => [tag.toLowerCase(), tag] as const),
    ).values(),
  ).slice(0, 3);

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
      className={`overflow-hidden rounded-3xl border ${
        scheme === 'dark'
          ? 'border-brand-800 bg-surface-cardDark'
          : 'border-brand-100 bg-white'
      } ${className || 'mb-3'}`}
      style={
        scheme === 'dark'
          ? undefined
          : {
              shadowColor: '#0A7C74',
              shadowOpacity: 0.07,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }
      }
    >
      <PlaceCardPhoto place={place} />
      <View className={`h-1.5 w-full ${bar}`} />
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <AppText className="flex-1 font-sans-bold text-lg leading-6">{title}</AppText>
          {place.distanceMeters != null ? (
            <View className="rounded-xl bg-brand-600 px-2.5 py-1">
              <AppText inverse className="text-xs font-sans-semibold">
                {formatDistanceMeters(place.distanceMeters)}
              </AppText>
            </View>
          ) : null}
        </View>

        <View className="mt-1.5 flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <AppText muted className="capitalize">
            {labelize(place.category)}
          </AppText>
          {ratingText ? (
            <View
              className={`rounded-lg px-2 py-0.5 ${
                scheme === 'dark' ? 'bg-amber-900/40' : 'bg-amber-50'
              }`}
            >
              <AppText className="text-xs font-sans-semibold text-amber-800 dark:text-amber-200">
                {ratingText}
              </AppText>
            </View>
          ) : null}
        </View>

        {price ? (
          <AppText className="mt-1.5 text-sm font-sans-medium text-brand-700 dark:text-brand-200">
            {price.label}
          </AppText>
        ) : null}

        {place.address ? (
          <AppText muted className="mt-1 text-sm leading-5">
            {place.address}
          </AppText>
        ) : null}

        {tags.length ? (
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {tags.map((tag) => (
              <View
                key={tag}
                className={`rounded-xl px-2.5 py-1 ${
                  scheme === 'dark' ? 'bg-brand-800' : 'bg-surface-mist'
                }`}
              >
                <AppText className="text-xs font-sans-medium text-brand-700 dark:text-brand-200">
                  {labelize(tag)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export const PlaceCard = memo(PlaceCardComponent);
