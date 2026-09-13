import type { GetTravelImageInput, TravelImage } from '@/lib/images/types';

/** Free Esri street tile — no API key (Carto watermarks without a key). */
export function esriStreetTileUrl(latitude: number, longitude: number, zoom = 15): string {
  const n = 2 ** zoom;
  const x = Math.floor(((longitude + 180) / 360) * n);
  const latRad = (latitude * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${y}/${x}`;
}

export function buildFallbackTravelImage(
  input: GetTravelImageInput,
  searchQuery: string,
): TravelImage {
  const lat = input.latitude;
  const lon = input.longitude;
  const hasCoords =
    lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon);
  const url = hasCoords
    ? esriStreetTileUrl(lat!, lon!)
    : esriStreetTileUrl(35.6812, 139.7671); // Tokyo default map preview

  const label = [input.name, input.city, input.country].filter(Boolean).join(', ');
  return {
    id: `fallback:${searchQuery}`,
    url,
    thumbnailUrl: url,
    provider: 'fallback',
    attribution: 'Map preview',
    alt: label || 'Travel destination',
    searchQuery,
  };
}
