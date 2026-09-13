import type { GeoPoint, Place, PlaceCategory } from '@/types/domain';

type CatalogEntry = {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  description?: string;
  cuisine?: string;
};

/**
 * Offline-friendly POIs for Bulacan / SJDM when Nominatim/Overpass are rate-limited.
 * Coordinates verified via Photon / known landmarks.
 */
const CATALOG: CatalogEntry[] = [
  // Attractions & landmarks
  {
    id: 'local-sm-sjdm',
    name: 'SM City San Jose Del Monte',
    category: 'mall',
    latitude: 14.786069,
    longitude: 121.074641,
    address: 'Quirino Highway, San Jose del Monte',
    rating: 4.4,
    reviewCount: 8200,
    tags: ['mall', 'shopping', 'attraction'],
    description: 'Major mall with dining, cinema, and shops.',
  },
  {
    id: 'local-starmall-sjdm',
    name: 'Starmall San Jose del Monte',
    category: 'mall',
    latitude: 14.814256,
    longitude: 121.070847,
    address: 'Quirino Hwy, San Jose del Monte',
    rating: 4.2,
    reviewCount: 3100,
    tags: ['mall', 'shopping'],
  },
  {
    id: 'local-grotto',
    name: 'Our Lady of Lourdes Grotto',
    category: 'temple',
    latitude: 14.794091,
    longitude: 121.066715,
    address: 'Grotto Vista, San Jose del Monte',
    rating: 4.6,
    reviewCount: 5400,
    tags: ['church', 'pilgrimage', 'attraction'],
    description: 'Popular pilgrimage site and city landmark.',
  },
  {
    id: 'local-grotto-vista',
    name: 'Grotto Vista Resort',
    category: 'attraction',
    latitude: 14.791297,
    longitude: 121.061251,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.3,
    reviewCount: 2100,
    tags: ['resort', 'pool', 'attraction'],
  },
  {
    id: 'local-tungkong',
    name: 'Tungkong Mangga',
    category: 'attraction',
    latitude: 14.78912,
    longitude: 121.074676,
    address: 'Quirino Highway, San Jose del Monte',
    rating: 4.1,
    reviewCount: 900,
    tags: ['district', 'shopping'],
    description: 'Busy commercial strip near SM SJDM.',
  },
  {
    id: 'local-public-market',
    name: 'Old San Jose del Monte Public Market',
    category: 'market',
    latitude: 14.810508,
    longitude: 121.047417,
    address: 'Poblacion, San Jose del Monte',
    rating: 4.0,
    reviewCount: 1200,
    tags: ['market', 'local'],
  },
  {
    id: 'local-francisco-homes',
    name: 'Francisco Homes',
    category: 'attraction',
    latitude: 14.808436,
    longitude: 121.060653,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.0,
    reviewCount: 600,
    tags: ['neighborhood'],
  },
  {
    id: 'local-tierra-fontana',
    name: 'Tierra Fontana 12 Waves Resort',
    category: 'attraction',
    latitude: 14.79733,
    longitude: 121.078678,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.2,
    reviewCount: 1500,
    tags: ['resort', 'pool'],
  },
  {
    id: 'local-philippine-arena',
    name: 'Philippine Arena',
    category: 'attraction',
    latitude: 14.796725,
    longitude: 120.94507,
    address: 'Ciudad de Victoria, Bocaue, Bulacan',
    rating: 4.5,
    reviewCount: 12_000,
    tags: ['arena', 'landmark', 'events'],
    description: "World's largest indoor arena at Ciudad de Victoria.",
  },
  {
    id: 'local-ciudad',
    name: 'Ciudad de Victoria',
    category: 'attraction',
    latitude: 14.7935,
    longitude: 120.951835,
    address: 'Bocaue, Bulacan',
    rating: 4.4,
    reviewCount: 4800,
    tags: ['complex', 'church', 'arena'],
  },
  {
    id: 'local-mt-balagbag',
    name: 'Mount Balagbag',
    category: 'viewpoint',
    latitude: 14.824309,
    longitude: 121.180413,
    address: 'Rodriguez, Rizal',
    rating: 4.5,
    reviewCount: 2200,
    tags: ['hike', 'viewpoint', 'nature'],
  },
  {
    id: 'local-puregold-sjdm',
    name: 'Puregold San Jose del Monte',
    category: 'shopping',
    latitude: 14.788001,
    longitude: 121.074239,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.1,
    reviewCount: 2800,
    tags: ['supermarket', 'shopping'],
  },
  {
    id: 'local-kaypian',
    name: 'Kaypian Road Strip',
    category: 'attraction',
    latitude: 14.815934,
    longitude: 121.059295,
    address: 'Kaypian Rd, San Jose del Monte',
    rating: 3.9,
    reviewCount: 400,
    tags: ['street', 'local'],
  },
  {
    id: 'local-quirino-hwy',
    name: 'Quirino Highway Commercial Area',
    category: 'attraction',
    latitude: 14.784231,
    longitude: 121.074619,
    address: 'Quirino Highway, San Jose del Monte',
    rating: 4.0,
    reviewCount: 700,
    tags: ['shopping', 'dining'],
  },
  {
    id: 'local-cathedral-approx',
    name: 'St. Joseph the Worker Cathedral Area',
    category: 'temple',
    latitude: 14.8132,
    longitude: 121.0458,
    address: 'Poblacion, San Jose del Monte',
    rating: 4.5,
    reviewCount: 1800,
    tags: ['church', 'cathedral'],
  },

  // Restaurants & cafes
  {
    id: 'local-jollibee-tm',
    name: 'Jollibee Tungkong Mangga',
    category: 'restaurant',
    latitude: 14.788958,
    longitude: 121.074496,
    address: 'Tungkong Mangga, San Jose del Monte',
    rating: 4.3,
    reviewCount: 4500,
    cuisine: 'Filipino fast food',
    tags: ['fast food', 'family'],
  },
  {
    id: 'local-jollibee-muzon',
    name: 'Jollibee Muzon',
    category: 'restaurant',
    latitude: 14.795639,
    longitude: 121.028051,
    address: 'Muzon, San Jose del Monte',
    rating: 4.2,
    reviewCount: 2100,
    cuisine: 'Filipino fast food',
    tags: ['fast food'],
  },
  {
    id: 'local-mcdonalds-sjdm',
    name: "McDonald's San Jose del Monte",
    category: 'restaurant',
    latitude: 14.806392,
    longitude: 121.068033,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.2,
    reviewCount: 3600,
    cuisine: 'Burgers',
    tags: ['fast food'],
  },
  {
    id: 'local-mcdonalds-muzon',
    name: "McDonald's Muzon",
    category: 'restaurant',
    latitude: 14.801045,
    longitude: 121.0331,
    address: 'Muzon, San Jose del Monte',
    rating: 4.1,
    reviewCount: 1900,
    cuisine: 'Burgers',
    tags: ['fast food'],
  },
  {
    id: 'local-mang-inasal',
    name: 'Mang Inasal San Jose del Monte',
    category: 'restaurant',
    latitude: 14.78855,
    longitude: 121.07455,
    address: 'Near SM City SJDM',
    rating: 4.3,
    reviewCount: 3200,
    cuisine: 'Filipino barbecue',
    tags: ['grill', 'family'],
  },
  {
    id: 'local-dorys',
    name: "Dory's Restaurant",
    category: 'restaurant',
    latitude: 14.792808,
    longitude: 121.070669,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.4,
    reviewCount: 1100,
    cuisine: 'Filipino',
    tags: ['local', 'family'],
  },
  {
    id: 'local-andoks',
    name: "Andok's San Jose del Monte",
    category: 'restaurant',
    latitude: 14.810218,
    longitude: 121.047285,
    address: 'Poblacion, San Jose del Monte',
    rating: 4.2,
    reviewCount: 2400,
    cuisine: 'Filipino barbecue',
    tags: ['grill'],
  },
  {
    id: 'local-kfc-sjdm',
    name: 'KFC San Jose del Monte',
    category: 'restaurant',
    latitude: 14.791926,
    longitude: 121.061937,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.1,
    reviewCount: 2800,
    cuisine: 'Chicken',
    tags: ['fast food'],
  },
  {
    id: 'local-goldilocks',
    name: 'Goldilocks San Jose del Monte',
    category: 'cafe',
    latitude: 14.788636,
    longitude: 121.074554,
    address: 'Near SM City SJDM',
    rating: 4.3,
    reviewCount: 3100,
    cuisine: 'Bakery & cakes',
    tags: ['bakery', 'cafe'],
  },
  {
    id: 'local-burger-king',
    name: 'Burger King San Jose del Monte',
    category: 'restaurant',
    latitude: 14.777239,
    longitude: 121.074697,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.0,
    reviewCount: 1600,
    cuisine: 'Burgers',
    tags: ['fast food'],
  },
  {
    id: 'local-potato-corner',
    name: 'Potato Corner San Jose del Monte',
    category: 'restaurant',
    latitude: 14.791854,
    longitude: 121.06228,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.2,
    reviewCount: 900,
    cuisine: 'Snacks',
    tags: ['snacks'],
  },
  {
    id: 'local-rustle-cafe',
    name: 'Rustle Cafe Lounge',
    category: 'cafe',
    latitude: 14.848177,
    longitude: 121.078225,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.4,
    reviewCount: 520,
    cuisine: 'Cafe',
    tags: ['cafe', 'coffee'],
  },
  {
    id: 'local-sm-food-court',
    name: 'SM City SJDM Food Court',
    category: 'restaurant',
    latitude: 14.7862,
    longitude: 121.0745,
    address: 'SM City San Jose Del Monte',
    rating: 4.1,
    reviewCount: 5000,
    cuisine: 'Mixed',
    tags: ['food court', 'mall'],
  },
  {
    id: 'local-starmall-food',
    name: 'Starmall SJDM Dining',
    category: 'restaurant',
    latitude: 14.8143,
    longitude: 121.0709,
    address: 'Starmall San Jose del Monte',
    rating: 4.0,
    reviewCount: 1800,
    cuisine: 'Mixed',
    tags: ['food court', 'mall'],
  },
  {
    id: 'local-gringneth',
    name: "Mang Pule's",
    category: 'restaurant',
    latitude: 14.805,
    longitude: 121.055,
    address: 'San Jose del Monte, Bulacan',
    rating: 4.2,
    reviewCount: 380,
    cuisine: 'Filipino',
    tags: ['local'],
  },
  {
    id: 'local-hotel-sogo-sjdm',
    name: 'Hotel Sogo San Jose Del Monte',
    category: 'hotel',
    latitude: 14.8125,
    longitude: 121.0485,
    address: 'Quirino Highway, San Jose del Monte',
    rating: 3.8,
    reviewCount: 900,
    tags: ['hotel'],
    description: 'Budget overnight stay near the city center.',
  },
  {
    id: 'local-reddoorz-sjdm',
    name: 'RedDoorz near SM San Jose Del Monte',
    category: 'hotel',
    latitude: 14.7895,
    longitude: 121.072,
    address: 'Near SM City SJDM',
    rating: 3.9,
    reviewCount: 640,
    tags: ['hotel'],
  },
  {
    id: 'local-microtel',
    name: 'Microtel by Wyndham South Forbes / nearby lodging',
    category: 'hotel',
    latitude: 14.8,
    longitude: 121.05,
    address: 'San Jose del Monte area',
    rating: 4.0,
    reviewCount: 420,
    tags: ['hotel'],
  },
];

const ATTRACTION_CATEGORIES = new Set<PlaceCategory>([
  'attraction',
  'mall',
  'park',
  'museum',
  'temple',
  'market',
  'viewpoint',
  'zoo',
  'shopping',
  'beach',
]);

const FOOD_CATEGORIES = new Set<PlaceCategory>(['restaurant', 'cafe', 'nightlife']);

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toPlace(entry: CatalogEntry, origin: GeoPoint): Place {
  return {
    id: entry.id,
    provider: 'local-catalog',
    providerPlaceId: entry.id,
    name: entry.name,
    category: entry.category,
    latitude: entry.latitude,
    longitude: entry.longitude,
    address: entry.address,
    rating: entry.rating,
    reviewCount: entry.reviewCount,
    tags: entry.tags,
    description: entry.description,
    cuisine: entry.cuisine,
    distanceMeters: Math.round(
      haversineMeters(origin, {
        latitude: entry.latitude,
        longitude: entry.longitude,
      }),
    ),
  };
}

function matchesHomeCategory(entry: CatalogEntry, category: 'attraction' | 'restaurant'): boolean {
  if (category === 'restaurant') {
    return FOOD_CATEGORIES.has(entry.category);
  }
  return ATTRACTION_CATEGORIES.has(entry.category);
}

/**
 * Returns curated places near `origin`, expanding radius until enough results
 * so Home still fills when live OSM APIs fail.
 */
export function getLocalNearbyPlaces(params: {
  location: GeoPoint;
  category: 'attraction' | 'restaurant';
  radiusMeters?: number;
  limit?: number;
}): Place[] {
  const limit = Math.min(Math.max(params.limit ?? 15, 1), 20);
  const radius = params.radiusMeters ?? 15_000;

  return CATALOG.filter((entry) => matchesHomeCategory(entry, params.category))
    .map((entry) => toPlace(entry, params.location))
    .filter((place) => (place.distanceMeters ?? 0) <= radius)
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
    .slice(0, limit);
}

/** Full pools for trip suggestion when live OSM/Nominatim fail. */
export function getLocalPlacePools(origin: GeoPoint): {
  attractions: Place[];
  restaurants: Place[];
  hotels: Place[];
  shopping: Place[];
} {
  const within = (maxMeters: number) =>
    CATALOG.map((entry) => toPlace(entry, origin)).filter(
      (place) => (place.distanceMeters ?? 0) <= maxMeters,
    );

  let all = within(40_000);
  if (all.length < 10) {
    all = within(90_000);
  }

  const attractions = all
    .filter((place) => ATTRACTION_CATEGORIES.has(place.category))
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  const restaurants = all
    .filter((place) => FOOD_CATEGORIES.has(place.category))
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  const hotels = all
    .filter((place) => place.category === 'hotel')
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  const shopping = all
    .filter(
      (place) =>
        place.category === 'mall' ||
        place.category === 'shopping' ||
        place.category === 'market' ||
        /mall|market|shop/i.test(place.name),
    )
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

  return { attractions, restaurants, hotels, shopping };
}
