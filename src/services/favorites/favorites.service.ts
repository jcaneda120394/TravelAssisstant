import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import { isUuid, useCloudStorage } from '@/lib/storage/cloud';
import { supabase } from '@/lib/supabase/client';
import type { FavoriteCollection, Place, SavedPlace } from '@/types/domain';

const SAVED_KEY = 'saved_places';
const COLLECTIONS_KEY = 'favorite_collections';

type SavedRow = {
  id: string;
  user_id: string;
  place_json: Place;
  collection_id: string | null;
  created_at: string;
};

type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export async function listSavedPlaces(userId: string): Promise<SavedPlace[]> {
  if (useCloudStorage(userId) && supabase) {
    const { data, error } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return (data as SavedRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      place: row.place_json,
      collectionId: row.collection_id ?? undefined,
      createdAt: row.created_at,
    }));
  }

  const items = await dbGet<SavedPlace[]>(SAVED_KEY, []);
  return items.filter((item) => item.userId === userId);
}

export async function savePlace(userId: string, place: Place, collectionId?: string) {
  if (useCloudStorage(userId) && supabase) {
    const existing = await listSavedPlaces(userId);
    const found = existing.find((item) => item.place.id === place.id);
    if (found) {
      return found;
    }
    const { data, error } = await supabase
      .from('saved_places')
      .insert({
        user_id: userId,
        place_json: place,
        collection_id: collectionId ?? null,
      })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const row = data as SavedRow;
    return {
      id: row.id,
      userId: row.user_id,
      place: row.place_json,
      collectionId: row.collection_id ?? undefined,
      createdAt: row.created_at,
    };
  }

  const items = await dbGet<SavedPlace[]>(SAVED_KEY, []);
  if (items.some((item) => item.userId === userId && item.place.id === place.id)) {
    return items.find((item) => item.userId === userId && item.place.id === place.id)!;
  }
  const saved: SavedPlace = {
    id: createId('saved'),
    userId,
    place,
    collectionId,
    createdAt: new Date().toISOString(),
  };
  await dbSet(SAVED_KEY, [saved, ...items]);
  return saved;
}

export async function unsavePlace(userId: string, placeId: string) {
  if (useCloudStorage(userId) && supabase) {
    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('user_id', userId)
      .filter('place_json->>id', 'eq', placeId);
    if (error) {
      // Fallback: fetch and delete by id
      const saved = await listSavedPlaces(userId);
      const match = saved.find((item) => item.place.id === placeId);
      if (match && isUuid(match.id)) {
        await supabase.from('saved_places').delete().eq('id', match.id);
      }
    }
    return;
  }

  const items = await dbGet<SavedPlace[]>(SAVED_KEY, []);
  await dbSet(
    SAVED_KEY,
    items.filter((item) => !(item.userId === userId && item.place.id === placeId)),
  );
}

export async function listCollections(userId: string): Promise<FavoriteCollection[]> {
  if (useCloudStorage(userId) && supabase) {
    const { data, error } = await supabase
      .from('favorite_collections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return (data as CollectionRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: row.created_at,
    }));
  }

  const items = await dbGet<FavoriteCollection[]>(COLLECTIONS_KEY, []);
  return items.filter((item) => item.userId === userId);
}

export async function createCollection(userId: string, name: string) {
  if (useCloudStorage(userId) && supabase) {
    const { data, error } = await supabase
      .from('favorite_collections')
      .insert({ user_id: userId, name })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    const row = data as CollectionRow;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: row.created_at,
    };
  }

  const collection: FavoriteCollection = {
    id: createId('col'),
    userId,
    name,
    createdAt: new Date().toISOString(),
  };
  const items = await dbGet<FavoriteCollection[]>(COLLECTIONS_KEY, []);
  await dbSet(COLLECTIONS_KEY, [collection, ...items]);
  return collection;
}
