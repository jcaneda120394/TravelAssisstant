/**
 * @deprecated Prefer `@/lib/images` (`getTravelImage`).
 * Kept as a thin compatibility shim for older imports.
 */
import {
  getTravelImage,
  type TravelImage,
} from '@/lib/images';
import type { PlacePhoto } from '@/services/places/place-photos.service';

function toPlacePhoto(image: TravelImage): PlacePhoto {
  const source =
    image.provider === 'fallback'
      ? ('map' as const)
      : (image.provider as PlacePhoto['source']);
  return {
    url: image.url,
    thumbUrl: image.thumbnailUrl ?? image.url,
    source,
    title: image.alt,
    attribution: image.attribution,
    photographer: image.photographer,
    score: image.provider === 'fallback' ? 0.05 : 0.85,
  };
}

/** Sequential stock resolve via central travel image service. */
export async function searchStockPhotos(query: string, _limit = 8): Promise<PlacePhoto[]> {
  if (!query.trim()) return [];
  const image = await getTravelImage({
    name: query,
    type: 'attraction',
  });
  if (!image.url) return [];
  return [toPlacePhoto(image)];
}

export async function openverseSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  return searchStockPhotos(query, limit);
}

export async function pexelsSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  return searchStockPhotos(query, limit);
}

export async function unsplashSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  return searchStockPhotos(query, limit);
}

export async function pixabaySearchPhotos(_query: string, _limit: number): Promise<PlacePhoto[]> {
  return [];
}

export async function flickrSearchPhotos(_query: string, _limit: number): Promise<PlacePhoto[]> {
  return [];
}
