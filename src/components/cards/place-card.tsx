import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import type { Place } from '@/types/domain';
import { formatDistanceMeters } from '@/utils/format';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export function PlaceCard({ place }: { place: Place }) {
  const router = useRouter();
  const scheme = useAppColorScheme();

  return (
    <Pressable
      testID={`place-card-${place.id}`}
      onPress={() => router.push(`/place/${place.id}`)}
      className={`mb-3 rounded-2xl border p-4 ${
        scheme === 'dark'
          ? 'border-brand-800 bg-surface-cardDark'
          : 'border-brand-100 bg-white'
      }`}
    >
      <AppText className="font-sans-semibold text-lg">{place.name}</AppText>
      <AppText muted className="mt-1 capitalize">
        {place.category.replace('_', ' ')}
        {place.rating ? ` · ${place.rating}★` : ''}
        {place.distanceMeters != null ? ` · ${formatDistanceMeters(place.distanceMeters)}` : ''}
      </AppText>
      {place.priceRange ? <AppText muted className="mt-1">{place.priceRange}</AppText> : null}
      {place.tags?.length ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {place.tags.slice(0, 3).map((tag) => (
            <View key={tag} className="rounded-full bg-brand-100 px-2 py-1 dark:bg-brand-800">
              <AppText className="text-xs">{tag}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
