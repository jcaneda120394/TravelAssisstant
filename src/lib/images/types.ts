/** Normalized travel image — UI never cares which provider supplied it. */

export type TravelImageProvider =
  | 'pexels'
  | 'unsplash'
  | 'openverse'
  | 'wikimedia'
  | 'fallback';

export type TravelImageType =
  | 'attraction'
  | 'landmark'
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'beach'
  | 'temple'
  | 'museum'
  | 'park'
  | 'market'
  | 'nightlife'
  | 'city'
  | 'country'
  | 'destination'
  | 'activity'
  | 'viewpoint'
  | 'other';

export type TravelImage = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  provider: TravelImageProvider;
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  attribution?: string;
  license?: string;
  alt: string;
  searchQuery: string;
};

export type GetTravelImageInput = {
  name: string;
  city?: string | null;
  country?: string | null;
  type?: TravelImageType | string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Skip these URLs (itinerary uniqueness). */
  excludeImageUrls?: string[];
  /** Skip these provider image ids. */
  excludeImageIds?: string[];
  /** Prefer a fresh lookup even if cache exists. */
  bypassCache?: boolean;
};

export type TravelImageCandidate = TravelImage & {
  /** Internal ranking 0–1 before acceptance. */
  score?: number;
};
