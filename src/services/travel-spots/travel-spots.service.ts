import * as ImagePicker from 'expo-image-picker';

import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import { listItinerary } from '@/services/itinerary/itinerary.service';
import { listTrips, mapTrip, updateTrip } from '@/services/trips/trips.service';
import {
  hasVisitedFromSources,
  todayUtcDateString,
} from '@/services/travel-spots/visit-eligibility';
import type {
  Place,
  PlaceCheckIn,
  PlaceReview,
  PlaceUserPhoto,
  Trip,
} from '@/types/domain';

const CHECKINS_KEY = 'place_checkins';
const REVIEWS_KEY = 'place_reviews';
const PHOTOS_KEY = 'place_photos';

type CheckInRow = {
  id: string;
  user_id: string;
  place_id: string;
  place_name: string;
  latitude: number | null;
  longitude: number | null;
  place_json: Place;
  visited_at: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  user_id: string;
  place_id: string;
  place_name: string;
  latitude: number | null;
  longitude: number | null;
  place_json: Place | Record<string, unknown> | null;
  rating: number;
  body: string;
  trip_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type PhotoRow = {
  id: string;
  user_id: string;
  place_id: string;
  place_name: string;
  review_id: string | null;
  storage_path: string;
  public_url: string;
  caption: string;
  is_public: boolean;
  created_at: string;
};

function mapCheckIn(row: CheckInRow): PlaceCheckIn {
  return {
    id: row.id,
    userId: row.user_id,
    placeId: row.place_id,
    placeName: row.place_name,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    place: row.place_json,
    visitedAt: row.visited_at,
    createdAt: row.created_at,
  };
}

function mapReview(row: ReviewRow, photos: PlaceUserPhoto[] = []): PlaceReview {
  const place =
    row.place_json && typeof row.place_json === 'object' && 'id' in row.place_json
      ? (row.place_json as Place)
      : undefined;
  return {
    id: row.id,
    userId: row.user_id,
    placeId: row.place_id,
    placeName: row.place_name,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    place,
    rating: row.rating,
    body: row.body ?? '',
    tripId: row.trip_id ?? undefined,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos,
  };
}

function mapPhoto(row: PhotoRow): PlaceUserPhoto {
  return {
    id: row.id,
    userId: row.user_id,
    placeId: row.place_id,
    placeName: row.place_name,
    reviewId: row.review_id ?? undefined,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    caption: row.caption ?? '',
    isPublic: row.is_public,
    createdAt: row.created_at,
  };
}

async function listLocalCheckIns(userId?: string): Promise<PlaceCheckIn[]> {
  const items = await dbGet<PlaceCheckIn[]>(CHECKINS_KEY, []);
  return userId ? items.filter((item) => item.userId === userId) : items;
}

async function listLocalReviews(): Promise<PlaceReview[]> {
  return dbGet<PlaceReview[]>(REVIEWS_KEY, []);
}

async function listLocalPhotos(): Promise<PlaceUserPhoto[]> {
  return dbGet<PlaceUserPhoto[]>(PHOTOS_KEY, []);
}

async function pastItineraryPlaceIds(userId: string): Promise<Set<string>> {
  const today = todayUtcDateString();
  const trips = await listTrips(userId);
  const ids = new Set<string>();
  await Promise.all(
    trips.map(async (trip) => {
      const items = await listItinerary(trip.id);
      for (const item of items) {
        if (item.placeId && item.day <= today) {
          ids.add(item.placeId);
        }
      }
    }),
  );
  return ids;
}

export async function checkInToPlace(userId: string, place: Place): Promise<PlaceCheckIn> {
  const now = new Date().toISOString();

  if (useCloudStorage(userId) && supabase) {
    const { data, error } = await supabase
      .from('place_checkins')
      .upsert(
        {
          user_id: userId,
          place_id: place.id,
          place_name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          place_json: place,
          visited_at: now,
        },
        { onConflict: 'user_id,place_id' },
      )
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return mapCheckIn(data as CheckInRow);
  }

  const items = await listLocalCheckIns();
  const existing = items.find((item) => item.userId === userId && item.placeId === place.id);
  if (existing) {
    return existing;
  }
  const checkIn: PlaceCheckIn = {
    id: createId('checkin'),
    userId,
    placeId: place.id,
    placeName: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    place,
    visitedAt: now,
    createdAt: now,
  };
  await dbSet(CHECKINS_KEY, [checkIn, ...items]);
  return checkIn;
}

export async function hasVisitedPlace(userId: string, placeId: string): Promise<boolean> {
  if (useCloudStorage(userId) && supabase) {
    const { data: checkIn } = await supabase
      .from('place_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('place_id', placeId)
      .maybeSingle();
    if (checkIn) {
      return true;
    }

    const today = todayUtcDateString();
    const { data: items } = await supabase
      .from('itinerary_items')
      .select('id, day, trips!inner(owner_id)')
      .eq('place_id', placeId)
      .eq('trips.owner_id', userId)
      .lte('day', today)
      .limit(1);
    return Boolean(items?.length);
  }

  const checkIns = await listLocalCheckIns(userId);
  const past = await pastItineraryPlaceIds(userId);
  return hasVisitedFromSources(placeId, {
    checkInPlaceIds: checkIns.map((item) => item.placeId),
    pastItineraryPlaceIds: past,
  });
}

async function uploadPlaceMedia(input: {
  userId: string;
  placeId: string;
  localUri: string;
}): Promise<{ storagePath: string; publicUrl: string }> {
  if (!useCloudStorage(input.userId) || !supabase) {
    return {
      storagePath: `local/${input.userId}/${input.placeId}/${createId('photo')}`,
      publicUrl: input.localUri,
    };
  }

  const extMatch = input.localUri.split('?')[0]?.match(/\.([a-zA-Z0-9]+)$/);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const storagePath = `${input.userId}/${input.placeId}/${createId('photo')}.${ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' ? ext : 'jpg'}`;

  const response = await fetch(input.localUri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from('place-media').upload(storagePath, blob, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('place-media').getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

export async function pickTravelSpotImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload travel photos.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: true,
    aspect: [4, 3],
  });
  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }
  return result.assets[0].uri;
}

export async function createPlaceReview(input: {
  userId: string;
  place: Place;
  rating: number;
  body: string;
  tripId?: string;
  imageUri?: string | null;
  caption?: string;
}): Promise<PlaceReview> {
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const body = input.body.trim();
  const now = new Date().toISOString();

  const visited = await hasVisitedPlace(input.userId, input.place.id);
  if (!visited) {
    throw new Error('Check in with “I’ve been here” (or visit on a past itinerary day) before reviewing.');
  }

  if (useCloudStorage(input.userId) && supabase) {
    const { data, error } = await supabase
      .from('place_reviews')
      .insert({
        user_id: input.userId,
        place_id: input.place.id,
        place_name: input.place.name,
        latitude: input.place.latitude,
        longitude: input.place.longitude,
        place_json: input.place,
        rating,
        body,
        trip_id: input.tripId && isUuid(input.tripId) ? input.tripId : null,
        is_public: true,
      })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const review = mapReview(data as ReviewRow);
    const photos: PlaceUserPhoto[] = [];
    if (input.imageUri) {
      const uploaded = await uploadPlaceMedia({
        userId: input.userId,
        placeId: input.place.id,
        localUri: input.imageUri,
      });
      const { data: photoRow, error: photoError } = await supabase
        .from('place_photos')
        .insert({
          user_id: input.userId,
          place_id: input.place.id,
          place_name: input.place.name,
          review_id: review.id,
          storage_path: uploaded.storagePath,
          public_url: uploaded.publicUrl,
          caption: input.caption?.trim() ?? '',
          is_public: true,
        })
        .select('*')
        .single();
      if (photoError) {
        throw photoError;
      }
      photos.push(mapPhoto(photoRow as PhotoRow));
    }
    return { ...review, photos };
  }

  const review: PlaceReview = {
    id: createId('review'),
    userId: input.userId,
    placeId: input.place.id,
    placeName: input.place.name,
    latitude: input.place.latitude,
    longitude: input.place.longitude,
    place: input.place,
    rating,
    body,
    tripId: input.tripId,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  };
  const photos: PlaceUserPhoto[] = [];
  if (input.imageUri) {
    const uploaded = await uploadPlaceMedia({
      userId: input.userId,
      placeId: input.place.id,
      localUri: input.imageUri,
    });
    const photo: PlaceUserPhoto = {
      id: createId('pphoto'),
      userId: input.userId,
      placeId: input.place.id,
      placeName: input.place.name,
      reviewId: review.id,
      storagePath: uploaded.storagePath,
      publicUrl: uploaded.publicUrl,
      caption: input.caption?.trim() ?? '',
      isPublic: true,
      createdAt: now,
    };
    photos.push(photo);
    const allPhotos = await listLocalPhotos();
    await dbSet(PHOTOS_KEY, [photo, ...allPhotos]);
  }
  const reviews = await listLocalReviews();
  await dbSet(REVIEWS_KEY, [{ ...review, photos }, ...reviews]);
  return { ...review, photos };
}

export async function listPublicPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  if (useCloudStorage() && supabase) {
    const { data: reviewRows, error } = await supabase
      .from('place_reviews')
      .select('*')
      .eq('place_id', placeId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    const reviews = (reviewRows as ReviewRow[]).map((row) => mapReview(row));
    const { data: photoRows } = await supabase
      .from('place_photos')
      .select('*')
      .eq('place_id', placeId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    const photos = ((photoRows as PhotoRow[]) ?? []).map(mapPhoto);
    return reviews.map((review) => ({
      ...review,
      photos: photos.filter((photo) => photo.reviewId === review.id),
    }));
  }

  const reviews = (await listLocalReviews()).filter(
    (item) => item.placeId === placeId && item.isPublic,
  );
  const photos = (await listLocalPhotos()).filter(
    (item) => item.placeId === placeId && item.isPublic,
  );
  return reviews.map((review) => ({
    ...review,
    photos: photos.filter((photo) => photo.reviewId === review.id),
  }));
}

export async function listPublicPlacePhotos(placeId: string): Promise<PlaceUserPhoto[]> {
  if (useCloudStorage() && supabase) {
    const { data, error } = await supabase
      .from('place_photos')
      .select('*')
      .eq('place_id', placeId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return ((data as PhotoRow[]) ?? []).map(mapPhoto);
  }
  return (await listLocalPhotos()).filter((item) => item.placeId === placeId && item.isPublic);
}

export type TravelSpotFeedItem = {
  id: string;
  kind: 'review' | 'photo';
  placeId: string;
  placeName: string;
  rating?: number;
  body?: string;
  caption?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  place?: Place;
  createdAt: string;
};

export async function listTravelSpotsFeed(options?: {
  limit?: number;
}): Promise<TravelSpotFeedItem[]> {
  const limit = options?.limit ?? 40;

  if (useCloudStorage() && supabase) {
    const [{ data: reviews }, { data: photos }] = await Promise.all([
      supabase
        .from('place_reviews')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('place_photos')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    const items: TravelSpotFeedItem[] = [
      ...((reviews as ReviewRow[]) ?? []).map((row) => {
        const review = mapReview(row);
        return {
          id: `review:${review.id}`,
          kind: 'review' as const,
          placeId: review.placeId,
          placeName: review.placeName,
          rating: review.rating,
          body: review.body,
          latitude: review.latitude,
          longitude: review.longitude,
          place: review.place,
          createdAt: review.createdAt,
        };
      }),
      ...((photos as PhotoRow[]) ?? []).map((row) => {
        const photo = mapPhoto(row);
        return {
          id: `photo:${photo.id}`,
          kind: 'photo' as const,
          placeId: photo.placeId,
          placeName: photo.placeName,
          caption: photo.caption,
          imageUrl: photo.publicUrl,
          createdAt: photo.createdAt,
        };
      }),
    ];
    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  const reviews = (await listLocalReviews()).filter((item) => item.isPublic);
  const photos = (await listLocalPhotos()).filter((item) => item.isPublic);
  const items: TravelSpotFeedItem[] = [
    ...reviews.map((review) => ({
      id: `review:${review.id}`,
      kind: 'review' as const,
      placeId: review.placeId,
      placeName: review.placeName,
      rating: review.rating,
      body: review.body,
      latitude: review.latitude,
      longitude: review.longitude,
      place: review.place,
      createdAt: review.createdAt,
      imageUrl: review.photos?.[0]?.publicUrl,
    })),
    ...photos.map((photo) => ({
      id: `photo:${photo.id}`,
      kind: 'photo' as const,
      placeId: photo.placeId,
      placeName: photo.placeName,
      caption: photo.caption,
      imageUrl: photo.publicUrl,
      createdAt: photo.createdAt,
    })),
  ];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function listPublicTrips(options?: { limit?: number }): Promise<Trip[]> {
  const limit = options?.limit ?? 30;

  if (useCloudStorage() && supabase) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) {
      throw error;
    }
    return (data ?? []).map((row) => mapTrip(row as Parameters<typeof mapTrip>[0]));
  }

  const all = await dbGet<Trip[]>('trips', []);
  return all
    .filter((trip) => trip.isPublic)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function setTripPublic(
  tripId: string,
  isPublic: boolean,
  publicSummary?: string,
): Promise<Trip> {
  return updateTrip(tripId, {
    isPublic,
    publicSummary: publicSummary?.trim() || undefined,
  });
}

export { hasVisitedFromSources };
