import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import type { FavoriteCollection, Place, SavedPlace } from '@/types/domain';

const SAVED_KEY = 'saved_places';
const COLLECTIONS_KEY = 'favorite_collections';

export async function listSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const items = await dbGet<SavedPlace[]>(SAVED_KEY, []);
  return items.filter((item) => item.userId === userId);
}

export async function savePlace(userId: string, place: Place, collectionId?: string) {
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
  const items = await dbGet<SavedPlace[]>(SAVED_KEY, []);
  await dbSet(
    SAVED_KEY,
    items.filter((item) => !(item.userId === userId && item.place.id === placeId)),
  );
}

export async function listCollections(userId: string): Promise<FavoriteCollection[]> {
  const items = await dbGet<FavoriteCollection[]>(COLLECTIONS_KEY, []);
  return items.filter((item) => item.userId === userId);
}

export async function createCollection(userId: string, name: string) {
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
