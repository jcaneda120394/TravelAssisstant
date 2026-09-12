import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { providers } from '@/providers/registry';
import { savePlace } from '@/services/favorites/favorites.service';
import { formatDistanceMeters } from '@/utils/format';
import { analytics } from '@/lib/analytics';

export function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['place', id],
    enabled: Boolean(id),
    queryFn: () => providers.places.getPlaceDetails(String(id)),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !query.data) {
        throw new Error('Sign in required');
      }
      return savePlace(user.id, query.data);
    },
    onSuccess: () => {
      analytics.track('place_saved', { placeId: id });
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      Alert.alert('Saved', 'Place added to favorites.');
    },
    onError: (error) => Alert.alert('Save failed', String(error)),
  });

  if (query.isLoading) {
    return (
      <Screen className="px-5 pt-14">
        <Skeleton height={180} />
      </Screen>
    );
  }

  if (!query.data) {
    return (
      <Screen className="px-5 pt-14">
        <EmptyState title="Place not found" description="This mock place id is unavailable." />
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const place = query.data;
  analytics.track('place_viewed', { placeId: place.id, category: place.category });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-place">
        <SectionHeader title={place.name} subtitle={place.address} />
        <Card className="mb-4">
          <AppText muted className="capitalize">
            {place.category.replace('_', ' ')}
            {place.rating ? ` · ${place.rating}★ (${place.reviewCount ?? 0})` : ''}
          </AppText>
          {place.distanceMeters != null ? (
            <AppText muted className="mt-1">{formatDistanceMeters(place.distanceMeters)}</AppText>
          ) : null}
          {place.priceRange ? <AppText muted className="mt-1">{place.priceRange}</AppText> : null}
          {place.description ? <AppText className="mt-3">{place.description}</AppText> : null}
          {place.openingHours?.length ? (
            <AppText muted className="mt-3">
              Hours: {place.openingHours.join(', ')}
            </AppText>
          ) : null}
          {place.phone ? <AppText muted className="mt-1">Phone: {place.phone}</AppText> : null}
        </Card>

        <View className="gap-3">
          <Button label="Directions" onPress={() => router.push({
            pathname: '/directions',
            params: { destinationId: place.id, destinationName: place.name },
          })} />
          <Button
            label="Save"
            variant="secondary"
            loading={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
          {place.phone ? (
            <Button
              label="Call"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${place.phone}`)}
            />
          ) : null}
          {place.website ? (
            <Button
              label="Website"
              variant="ghost"
              onPress={() => void Linking.openURL(place.website!)}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
