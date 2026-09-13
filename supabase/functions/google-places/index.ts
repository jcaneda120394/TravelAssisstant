// Supabase Edge Function: google-places
// Accurate Google Places (New) for ALL app search surfaces:
// nearby, text search, details, and photos.
// Requires GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY (Places API New).
// Guests allowed (verify_jwt = false); rate-limited. Does not store results.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = (Deno.env.get("AI_CHAT_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8081",
  "https://travelassistant-umber.vercel.app",
  "https://travel-assistant-jet.vercel.app",
];

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowList = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;
  const allowOrigin =
    allowList.includes(origin) || /\.vercel\.app$/i.test(origin)
      ? origin || allowList[0]!
      : allowList[0]!;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

function truncate(input: string, max: number): string {
  return input.length <= max ? input : input.slice(0, max);
}

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
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

function significantTokens(text: string): string[] {
  const stop = new Set([
    "the", "and", "for", "near", "with", "from", "restaurant", "cafe", "food",
    "island", "park", "national", "of", "at", "in", "de", "la", "del",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stop.has(t));
}

function namesLikelyMatch(placeName: string, googleName: string): boolean {
  const a = significantTokens(placeName);
  const b = new Set(significantTokens(googleName));
  if (a.length === 0 || b.size === 0) return false;
  const matched = a.filter((t) => b.has(t) || [...b].some((x) => x.includes(t) || t.includes(x)));
  if (matched.length >= 2) return true;
  if (matched.length === 1 && matched[0]!.length >= 5 && a.length <= 3) return true;
  const compactA = placeName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const compactB = googleName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    compactA.length >= 6 &&
    (compactB.includes(compactA.slice(0, 12)) || compactA.includes(compactB.slice(0, 12)))
  );
}

/** Map our app categories → Google Places Table A types. */
function googleTypesForCategory(category?: string | null): string[] {
  switch (category) {
    case "restaurant":
      return ["restaurant"];
    case "cafe":
      return ["cafe"];
    case "bakery":
      return ["bakery"];
    case "hotel":
    case "resort":
      return ["lodging"];
    case "shopping":
    case "souvenir":
      return ["clothing_store", "gift_shop", "shopping_mall", "store"];
    case "mall":
      return ["shopping_mall", "department_store"];
    case "market":
      return ["supermarket", "grocery_store"];
    case "park":
      return ["park", "national_park"];
    case "museum":
      return ["museum"];
    case "temple":
      return ["church", "hindu_temple", "mosque", "synagogue"];
    case "viewpoint":
      return ["tourist_attraction"];
    case "zoo":
      return ["zoo", "aquarium"];
    case "nightlife":
      return ["bar", "night_club"];
    case "beach":
      return ["beach"];
    case "spa":
    case "hot_spring":
    case "spring":
    case "cold_spring":
      return ["spa"];
    case "lake":
    case "river":
      return ["park", "tourist_attraction"];
    case "hospital":
      return ["hospital"];
    case "clinic":
      return ["doctor", "hospital"];
    case "pharmacy":
      return ["pharmacy"];
    case "police":
      return ["police"];
    case "fire":
      return ["fire_station"];
    case "atm":
      return ["atm"];
    case "bank":
      return ["bank"];
    case "convenience":
      return ["convenience_store"];
    case "airport":
      return ["airport"];
    case "transit_station":
      return ["transit_station", "bus_station", "train_station", "subway_station"];
    case "parking":
      return ["parking"];
    case "fuel":
      return ["gas_station"];
    case "laundry":
      return ["laundry"];
    case "gym":
      return ["gym"];
    case "tourist_info":
      return ["tourist_attraction"];
    case "attraction":
    default:
      return ["tourist_attraction", "museum", "park", "church"];
  }
}

function mapGoogleCategory(primaryType?: string, types: string[] = []): string {
  const all = [primaryType, ...types].filter(Boolean).map((t) => t!.toLowerCase());
  const has = (re: RegExp) => all.some((t) => re.test(t));
  if (has(/restaurant|meal_takeaway|food/)) return "restaurant";
  if (has(/cafe|coffee/)) return "cafe";
  if (has(/bakery/)) return "bakery";
  if (has(/lodging|hotel|resort/)) return "hotel";
  if (has(/shopping_mall|department_store/)) return "mall";
  if (has(/market|supermarket/)) return "market";
  if (has(/museum/)) return "museum";
  if (has(/park|national_park/)) return "park";
  if (has(/zoo|aquarium/)) return "zoo";
  if (has(/beach/)) return "beach";
  if (has(/spa|hot_spring/)) return "spa";
  if (has(/bar|night_club/)) return "nightlife";
  if (has(/church|temple|mosque|synagogue|place_of_worship/)) return "temple";
  if (has(/hospital/)) return "hospital";
  if (has(/pharmacy/)) return "pharmacy";
  if (has(/police/)) return "police";
  if (has(/atm/)) return "atm";
  if (has(/bank/)) return "bank";
  if (has(/airport/)) return "airport";
  if (has(/transit|train_station|bus_station|subway/)) return "transit_station";
  if (has(/tourist_attraction|historical_landmark|monument|observation/)) return "attraction";
  if (has(/store|gift|clothing/)) return "shopping";
  return "attraction";
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  editorialSummary?: { text?: string };
  photos?: Array<{ name?: string }>;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

type AppPlace = {
  id: string;
  provider: "google";
  providerPlaceId: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  website?: string;
  phone?: string;
  description?: string;
  openingHours?: string[];
  photos?: string[];
  tags?: string[];
  distanceMeters?: number;
};

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.websiteUri,places.internationalPhoneNumber,places.editorialSummary,places.regularOpeningHours";

const DETAIL_MASK =
  "id,displayName,formattedAddress,location,types,primaryType,rating,userRatingCount,priceLevel,photos,websiteUri,internationalPhoneNumber,editorialSummary,regularOpeningHours";

function priceLevelNumber(level?: string): number | undefined {
  switch (level) {
    case "PRICE_LEVEL_FREE":
      return 0;
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return undefined;
  }
}

async function resolvePhotoUri(
  apiKey: string,
  photoName: string,
  maxWidthPx: number,
): Promise<string | null> {
  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": apiKey } },
  );
  if (!mediaRes.ok) return null;
  const json = (await mediaRes.json()) as { photoUri?: string };
  return json.photoUri ?? null;
}

async function toAppPlace(
  apiKey: string,
  place: GooglePlace,
  origin?: { latitude: number; longitude: number },
  withPhoto = true,
): Promise<AppPlace | null> {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const name = place.displayName?.text?.trim();
  const id = place.id?.trim();
  if (lat == null || lng == null || !name || !id) return null;

  let photos: string[] | undefined;
  if (withPhoto && place.photos?.[0]?.name) {
    const uri = await resolvePhotoUri(apiKey, place.photos[0].name, 900);
    if (uri) photos = [uri];
  }

  const distanceMeters = origin
    ? Math.round(haversineMeters(origin, { latitude: lat, longitude: lng }))
    : undefined;

  return {
    id: `google-${id}`,
    provider: "google",
    providerPlaceId: id,
    name,
    category: mapGoogleCategory(place.primaryType, place.types ?? []),
    latitude: lat,
    longitude: lng,
    address: place.formattedAddress,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    priceLevel: priceLevelNumber(place.priceLevel),
    website: place.websiteUri,
    phone: place.internationalPhoneNumber,
    description: place.editorialSummary?.text,
    openingHours: place.regularOpeningHours?.weekdayDescriptions,
    photos,
    tags: [place.primaryType, ...(place.types ?? [])].filter(Boolean).slice(0, 6) as string[],
    distanceMeters,
  };
}

async function mapPlaces(
  apiKey: string,
  places: GooglePlace[],
  origin?: { latitude: number; longitude: number },
  withPhotos = true,
  limit = 20,
): Promise<AppPlace[]> {
  const slice = places.slice(0, Math.min(limit, 20));
  // Resolve first photo in parallel for card accuracy.
  const mapped = await Promise.all(
    slice.map((p) => toAppPlace(apiKey, p, origin, withPhotos)),
  );
  return mapped.filter((p): p is AppPlace => p != null);
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": status === 200 ? "public, max-age=300" : "no-store",
    },
  });
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  const clientKey =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "anon";
  if (!checkRateLimit(clientKey)) {
    return json({ error: "Too many Google Places requests. Try again shortly." }, 429, cors);
  }

  const apiKey =
    Deno.env.get("GOOGLE_MAPS_API_KEY")?.trim() ||
    Deno.env.get("GOOGLE_PLACES_API_KEY")?.trim() ||
    "";
  if (!apiKey) {
    return json({ error: "Google Places is not configured", code: "NO_GOOGLE_KEY" }, 503, cors);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, cors);
  }

  // Backward compatible with place-photo: missing action => photo
  const action = String(body.action ?? "photo").toLowerCase();

  try {
    if (action === "nearby") {
      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      const radiusMeters = Math.min(Math.max(Number(body.radiusMeters) || 15_000, 100), 50_000);
      const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 20);
      const category = body.category != null ? String(body.category) : null;
      const cityLabel = body.cityLabel != null ? truncate(String(body.cityLabel), 80) : "";
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return json({ error: "latitude and longitude are required" }, 400, cors);
      }

      const includedTypes = googleTypesForCategory(category);
      const nearbyRes = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: limit,
          rankPreference: "POPULARITY",
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: radiusMeters,
            },
          },
        }),
      });

      let places: GooglePlace[] = [];
      if (nearbyRes.ok) {
        const data = (await nearbyRes.json()) as { places?: GooglePlace[] };
        places = data.places ?? [];
      }

      // Sparse / vague categories: also text-search popular spots near the city.
      if (places.length < Math.min(6, limit)) {
        const textQuery = [
          category && category !== "attraction" ? category.replace(/_/g, " ") : "tourist attractions",
          cityLabel || "near me",
        ].join(" ");
        const textRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": FIELD_MASK,
          },
          body: JSON.stringify({
            textQuery,
            maxResultCount: limit,
            locationBias: {
              circle: {
                center: { latitude, longitude },
                radius: radiusMeters,
              },
            },
          }),
        });
        if (textRes.ok) {
          const data = (await textRes.json()) as { places?: GooglePlace[] };
          places = [...places, ...(data.places ?? [])];
        }
      }

      const origin = { latitude, longitude };
      const mapped = await mapPlaces(apiKey, places, origin, true, limit);
      // Dedupe by provider id
      const seen = new Set<string>();
      const deduped = mapped.filter((p) => {
        if (seen.has(p.providerPlaceId)) return false;
        seen.add(p.providerPlaceId);
        return true;
      });
      return json({ places: deduped.slice(0, limit), source: "google" }, 200, cors);
    }

    if (action === "search") {
      const query = truncate(String(body.query ?? "").trim(), 160);
      const limit = Math.min(Math.max(Number(body.limit) || 12, 1), 20);
      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      if (query.length < 2) return json({ error: "query is required" }, 400, cors);

      const payload: Record<string, unknown> = {
        textQuery: query,
        maxResultCount: limit,
      };
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        payload.locationBias = {
          circle: {
            center: { latitude, longitude },
            radius: Math.min(Math.max(Number(body.radiusMeters) || 30_000, 500), 50_000),
          },
        };
      }

      const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(payload),
      });
      if (!searchRes.ok) {
        return json(
          { error: "Google text search failed", detail: truncate(await searchRes.text(), 400) },
          502,
          cors,
        );
      }
      const data = (await searchRes.json()) as { places?: GooglePlace[] };
      const origin =
        Number.isFinite(latitude) && Number.isFinite(longitude)
          ? { latitude, longitude }
          : undefined;
      const mapped = await mapPlaces(apiKey, data.places ?? [], origin, true, limit);
      return json({ places: mapped, source: "google" }, 200, cors);
    }

    if (action === "details") {
      const placeId = truncate(String(body.placeId ?? "").replace(/^google-/, ""), 128);
      if (!placeId) return json({ error: "placeId is required" }, 400, cors);
      const detailRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": DETAIL_MASK,
        },
      });
      if (!detailRes.ok) {
        return json(
          { error: "Google place details failed", detail: truncate(await detailRes.text(), 400) },
          502,
          cors,
        );
      }
      const place = (await detailRes.json()) as GooglePlace;
      // Resolve up to 6 photos for the detail gallery.
      const photoNames = (place.photos ?? []).slice(0, 6).map((p) => p.name).filter(Boolean) as string[];
      const photoUris = (
        await Promise.all(photoNames.map((n) => resolvePhotoUri(apiKey, n, 1200)))
      ).filter((u): u is string => Boolean(u));
      const mapped = await toAppPlace(apiKey, place, undefined, false);
      if (!mapped) return json({ place: null }, 200, cors);
      mapped.photos = photoUris;
      return json({ place: mapped, source: "google" }, 200, cors);
    }

    // action === "photo" (default)
    const name = truncate(String(body.name ?? "").trim(), 120);
    const address = truncate(String(body.address ?? "").trim(), 160);
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const maxWidthPx = Math.min(Math.max(Number(body.maxWidthPx) || 900, 200), 1600);
    if (name.length < 2 || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return json({ error: "name, latitude, and longitude are required" }, 400, cors);
    }

    const textQuery = [name, address].filter(Boolean).join(", ");
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.photos",
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 5,
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: 8_000.0,
          },
        },
      }),
    });
    if (!searchRes.ok) {
      return json(
        { error: "Google Places search failed", detail: truncate(await searchRes.text(), 400) },
        502,
        cors,
      );
    }
    const searchJson = (await searchRes.json()) as { places?: GooglePlace[] };
    const origin = { latitude, longitude };
    const match = (searchJson.places ?? []).find((place) => {
      const gName = place.displayName?.text ?? "";
      if (!namesLikelyMatch(name, gName)) return false;
      const gLat = place.location?.latitude;
      const gLng = place.location?.longitude;
      if (gLat == null || gLng == null) return true;
      return haversineMeters(origin, { latitude: gLat, longitude: gLng }) <= 12_000;
    });
    const photoName = match?.photos?.[0]?.name;
    if (!match || !photoName) return json({ photo: null }, 200, cors);

    const photoUri = await resolvePhotoUri(apiKey, photoName, maxWidthPx);
    if (!photoUri) return json({ photo: null }, 200, cors);
    let thumbUri = photoUri;
    if (maxWidthPx > 480) {
      thumbUri = (await resolvePhotoUri(apiKey, photoName, 480)) ?? photoUri;
    }
    return json(
      {
        photo: {
          url: photoUri,
          thumbUrl: thumbUri,
          title: match.displayName?.text ?? name,
          source: "google",
          placeId: match.id ?? null,
        },
      },
      200,
      cors,
    );
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Google Places request failed" },
      500,
      cors,
    );
  }
});
