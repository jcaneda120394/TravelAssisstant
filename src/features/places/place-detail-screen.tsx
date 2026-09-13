import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking } from 'react-native';

import { PlacePhotoGallery } from '@/components/places/place-photo-gallery';
import { TextField } from '@/components/forms/text-field';
import { SaveTripModal } from '@/components/trips/save-trip-modal';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { requireAuthToSave } from '@/features/auth/require-auth';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { providers } from '@/providers/registry';
import { savePlace } from '@/services/favorites/favorites.service';
import { recallPlace, rememberPlace } from '@/services/places/place-cache';
import { fetchPlacePhotos, type PlacePhoto } from '@/services/places/place-photos.service';
import {
  checkInToPlace,
  createPlaceReview,
  hasVisitedPlace,
  listPublicPlacePhotos,
  listPublicPlaceReviews,
  pickTravelSpotImage,
} from '@/services/travel-spots/travel-spots.service';
import { formatDistanceMeters } from '@/utils/format';
import {
  estimatePlacePrice,
  formatPlaceRating,
} from '@/utils/place-price-estimate';
import { displayOpeningHours, displayPlaceName } from '@/utils/place-name';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { labelize } from '@/constants/preferences';
import type { Place } from '@/types/domain';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4">
      <AppText muted className="mb-1 text-[12px] font-sans-medium uppercase tracking-wide">
        {label}
      </AppText>
      <AppText className="text-[15px] leading-5">{value}</AppText>
    </View>
  );
}

function parseSnapshot(raw: unknown): Place | null {
  if (typeof raw !== 'string' || !raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Place;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <View className="mb-3 flex-row gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          className={`h-10 w-10 items-center justify-center rounded-full ${
            star <= value ? 'bg-brand-600' : 'bg-brand-100 dark:bg-brand-800'
          }`}
        >
          <AppText className={star <= value ? 'text-white' : ''}>{star}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

export function PlaceDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    snapshot?: string | string[];
  }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const rawSnapshot = Array.isArray(params.snapshot) ? params.snapshot[0] : params.snapshot;
  const id = rawId ? decodeURIComponent(String(rawId)) : '';
  const router = useRouter();
  const { user } = useAuth();
  const { currency, budgetTier } = useDisplayCurrency();
  const queryClient = useQueryClient();
  const [saveTripOpen, setSaveTripOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setShowReviewForm(false);
      setImageUri(null);
    }
  }, [user]);

  const seeded = useMemo(() => {
    const fromParams = parseSnapshot(rawSnapshot);
    const fromCache = id ? recallPlace(id) : null;
    const place = fromParams ?? fromCache;
    if (place) {
      rememberPlace(place);
    }
    return place;
  }, [id, rawSnapshot]);

  const query = useQuery({
    queryKey: ['place', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const details = await providers.places.getPlaceDetails(id);
      if (details) {
        rememberPlace(details);
        return details;
      }
      // Never drop the list snapshot if enrichment fails.
      return seeded ?? recallPlace(id);
    },
    initialData: seeded ?? undefined,
    staleTime: 5 * 60_000,
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
    onError: (error) => Alert.alert('Save failed', getErrorMessage(error)),
  });

  const place = query.data ?? seeded;

  const photosQuery = useQuery({
    queryKey: ['place-photos', 'v3-google', place?.id, place?.name, place?.latitude, place?.longitude],
    enabled: Boolean(place?.id),
    queryFn: async () => {
      const photos = await fetchPlacePhotos(place!, 6);
      if (place && photos.length && photos[0]?.source !== 'map') {
        rememberPlace({
          ...place,
          photos: photos.map((photo) => photo.url),
        });
      }
      return photos;
    },
    staleTime: 30 * 60_000,
  });

  const communityPhotosQuery = useQuery({
    queryKey: ['place-community-photos', place?.id],
    enabled: Boolean(place?.id),
    queryFn: () => listPublicPlacePhotos(place!.id),
    staleTime: 60_000,
  });

  const reviewsQuery = useQuery({
    queryKey: ['place-reviews', place?.id],
    enabled: Boolean(place?.id),
    queryFn: () => listPublicPlaceReviews(place!.id),
    staleTime: 60_000,
  });

  const visitedQuery = useQuery({
    queryKey: ['place-visited', user?.id, place?.id],
    enabled: Boolean(user?.id && place?.id),
    queryFn: () => hasVisitedPlace(user!.id, place!.id),
  });

  const galleryPhotos = useMemo((): PlacePhoto[] => {
    const base = photosQuery.data ?? [];
    const community = (communityPhotosQuery.data ?? []).map((photo) => ({
      url: photo.publicUrl,
      source: 'community' as const,
      title: photo.caption || 'Traveler photo',
    }));
    return [...community, ...base];
  }, [photosQuery.data, communityPhotosQuery.data]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!user || !place) {
        throw new Error('Sign in required');
      }
      return checkInToPlace(user.id, place);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['place-visited', user?.id, place?.id] });
      Alert.alert('Checked in', 'You can now add a photo and review.');
      setShowReviewForm(true);
    },
    onError: (error) => Alert.alert('Check-in failed', getErrorMessage(error)),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!user || !place) {
        throw new Error('Sign in required');
      }
      if (!reviewBody.trim() && !imageUri) {
        throw new Error('Add a short review or a photo.');
      }
      return createPlaceReview({
        userId: user.id,
        place,
        rating,
        body: reviewBody,
        imageUri,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['place-reviews', place?.id] });
      void queryClient.invalidateQueries({ queryKey: ['place-community-photos', place?.id] });
      void queryClient.invalidateQueries({ queryKey: ['travel-spots-feed'] });
      setReviewBody('');
      setImageUri(null);
      setRating(5);
      setShowReviewForm(false);
      Alert.alert('Shared', 'Your review is public on Travel Guide.');
    },
    onError: (error) => Alert.alert('Could not share review', getErrorMessage(error)),
  });

  if (!id) {
    return (
      <Screen className="px-5 pt-4">
        <Skeleton height={180} />
      </Screen>
    );
  }

  if (!place && query.isFetching) {
    return (
      <Screen className="px-5 pt-4">
        <Skeleton height={180} />
      </Screen>
    );
  }

  if (!place) {
    return (
      <Screen className="px-5 pt-4">
        <EmptyState
          title="Place not found"
          description="Go back and tap the restaurant again from Home or Explore."
        />
        <View className="mt-4">
          <Button label="Back" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const title = displayPlaceName(place);
  const hoursText = displayOpeningHours(place.openingHours);
  const cuisineText = place.cuisine
    ? place.cuisine
        .split(';')
        .map((part) => labelize(part.trim()))
        .join(', ')
    : null;
  const ratingText = formatPlaceRating(place);
  const priceEstimate = estimatePlacePrice(place, currency, budgetTier);
  const priceLabel =
    priceEstimate?.unit === 'night'
      ? 'Est. price / night'
      : priceEstimate?.unit === 'meal'
        ? 'Est. meal range'
        : priceEstimate?.unit === 'ticket'
          ? 'Est. ticket / fee'
          : priceEstimate?.unit === 'free'
            ? 'Entry'
            : priceEstimate?.unit === 'unknown'
              ? 'Price'
              : priceEstimate?.unit === 'visit'
                ? 'Est. visit'
                : priceEstimate?.unit === 'pass'
                  ? 'Est. day pass'
                  : 'Price';
  const visited = Boolean(visitedQuery.data);

  return (
    <Screen>
      <ScrollView className="flex-1 pt-0" contentContainerClassName="pb-10" testID="screen-place">
        <View className="px-5 pt-4">
          <SectionHeader
            title={title}
            subtitle={`${labelize(place.category)}${
              place.distanceMeters != null ? ` · ${formatDistanceMeters(place.distanceMeters)}` : ''
            }${ratingText ? ` · ${ratingText}` : ''}`}
          />
        </View>

        <View className="mb-4">
          <PlacePhotoGallery
            photos={galleryPhotos}
            loading={photosQuery.isLoading || photosQuery.isFetching}
            placeName={title}
          />
        </View>

        <View className="px-5">
        <Card className="mb-4">
          <DetailRow label="Address" value={place.address ?? 'Address not listed'} />
          <DetailRow label="Open / close hours" value={hoursText} />
          {cuisineText ? <DetailRow label="Cuisine / menu style" value={cuisineText} /> : null}
          {ratingText ? <DetailRow label="Rating" value={ratingText} /> : null}
          {priceEstimate ? (
            <DetailRow
              label={priceLabel}
              value={
                priceEstimate.isEstimate
                  ? priceEstimate.label
                  : priceEstimate.label
              }
            />
          ) : null}
          {place.menuUrl ? (
            <DetailRow label="Menu" value={place.menuUrl} />
          ) : place.category === 'restaurant' || place.category === 'cafe' ? (
            <DetailRow
              label="Menu"
              value="No menu link in OpenStreetMap. Check the website or call the place."
            />
          ) : null}
          {place.phone ? <DetailRow label="Phone" value={place.phone} /> : null}
          {place.website ? <DetailRow label="Website" value={place.website} /> : null}
          {place.description ? <DetailRow label="Notes" value={place.description} /> : null}
          {place.tags?.length ? (
            <View className="mt-1 flex-row flex-wrap gap-2">
              {place.tags
                .filter((tag) => !/^(house|yes|no|building|residential)$/i.test(tag))
                .map((tag) => (
                  <View key={tag} className="rounded-lg bg-surface-mist px-2.5 py-1 dark:bg-brand-800">
                    <AppText className="text-xs font-sans-medium">{labelize(tag)}</AppText>
                  </View>
                ))}
            </View>
          ) : null}
        </Card>

        <Card className="mb-4">
          <SectionHeader
            title="Travelers’ photos & reviews"
            subtitle="Public tips from people who’ve been here"
          />
          {!user ? (
            <View className="mb-3 gap-2">
              <AppText muted className="text-sm">
                Anyone can read reviews. Sign up to check in and share your own photos.
              </AppText>
              <Button
                label="Sign in to add a review"
                variant="secondary"
                onPress={() => {
                  requireAuthToSave(router, { actionLabel: 'add photos and reviews' });
                }}
              />
            </View>
          ) : null}
          {user && !visited ? (
            <View className="mb-3">
              <Button
                label="I’ve been here"
                loading={checkInMutation.isPending}
                onPress={() => {
                  if (!requireAuthToSave(router, { actionLabel: 'check in at places' })) return;
                  checkInMutation.mutate();
                }}
              />
            </View>
          ) : null}
          {user && visited ? (
            <View className="mb-3 gap-2">
              {!showReviewForm ? (
                <Button
                  label="Add photo & review"
                  variant="secondary"
                  onPress={() => {
                    if (!requireAuthToSave(router, { actionLabel: 'add photos and reviews' })) {
                      return;
                    }
                    setShowReviewForm(true);
                  }}
                />
              ) : (
                <View>
                  <AppText className="mb-2 text-xs font-sans-semibold uppercase tracking-wide text-brand-500">
                    Your rating
                  </AppText>
                  <StarPicker value={rating} onChange={setRating} />
                  <TextField
                    label="Review"
                    value={reviewBody}
                    onChangeText={setReviewBody}
                    placeholder="What should other travelers know?"
                    multiline
                  />
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      className="mb-3 h-36 w-full rounded-2xl"
                      resizeMode="cover"
                    />
                  ) : null}
                  <View className="mb-2 flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        label={imageUri ? 'Change photo' : 'Add photo'}
                        variant="secondary"
                        onPress={() => {
                          if (!requireAuthToSave(router, { actionLabel: 'add photos and reviews' })) {
                            return;
                          }
                          void pickTravelSpotImage()
                            .then((uri) => {
                              if (uri) setImageUri(uri);
                            })
                            .catch((error) => Alert.alert('Photo picker', getErrorMessage(error)));
                        }}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Share"
                        loading={reviewMutation.isPending}
                        onPress={() => {
                          if (!requireAuthToSave(router, { actionLabel: 'add photos and reviews' })) {
                            return;
                          }
                          reviewMutation.mutate();
                        }}
                      />
                    </View>
                  </View>
                  <Button label="Cancel" variant="ghost" onPress={() => setShowReviewForm(false)} />
                </View>
              )}
            </View>
          ) : null}
          {(reviewsQuery.data ?? []).map((review) => (
            <View
              key={review.id}
              className="mb-3 border-t border-black/8 pt-3 dark:border-brand-800"
            >
              <AppText className="font-sans-semibold">
                {'★'.repeat(review.rating)}
                {'☆'.repeat(Math.max(0, 5 - review.rating))}
              </AppText>
              {review.body ? <AppText className="mt-1">{review.body}</AppText> : null}
              {(review.photos ?? []).map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.publicUrl }}
                  className="mt-2 h-40 w-full rounded-2xl"
                  resizeMode="cover"
                />
              ))}
            </View>
          ))}
          {(reviewsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No traveler reviews yet"
              description={
                user
                  ? 'Be the first to check in and share a tip.'
                  : 'Reviews will show here when travelers share them. Sign in to add yours.'
              }
            />
          ) : null}
        </Card>

        <View className="gap-3">
          <Button
            label="Add to trip planner"
            onPress={() => {
              if (!requireAuthToSave(router, { actionLabel: 'add places to your trip planner' })) {
                return;
              }
              setSaveTripOpen(true);
            }}
          />
          <Button
            label="Save favorite"
            variant="secondary"
            loading={saveMutation.isPending}
            onPress={() => {
              if (!requireAuthToSave(router, { actionLabel: 'save favorites' })) return;
              saveMutation.mutate();
            }}
          />
          <Button
            label="Directions"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/directions',
                params: {
                  destinationId: place.id,
                  destinationName: title,
                  destinationLat: String(place.latitude),
                  destinationLng: String(place.longitude),
                },
              })
            }
          />
          {place.phone ? (
            <Button
              label="Call"
              variant="ghost"
              onPress={() => void Linking.openURL(`tel:${place.phone}`)}
            />
          ) : null}
          {place.menuUrl ? (
            <Button
              label="Open menu"
              variant="ghost"
              onPress={() => void Linking.openURL(place.menuUrl!)}
            />
          ) : null}
          {place.website ? (
            <Button
              label="Website"
              variant="ghost"
              onPress={() => void Linking.openURL(place.website!)}
            />
          ) : null}
          <Button
            label="Open in maps"
            variant="ghost"
            onPress={() =>
              void Linking.openURL(
                `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=18/${place.latitude}/${place.longitude}`,
              )
            }
          />
        </View>
        </View>
      </ScrollView>

      <SaveTripModal
        visible={saveTripOpen}
        onClose={() => setSaveTripOpen(false)}
        place={place}
        destinationHint={place.name}
        onSaved={(tripId) => router.push(`/trip/${tripId}`)}
      />
    </Screen>
  );
}
