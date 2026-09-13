// Supabase Edge Function: place-photo
// Resolve an accurate Google Places photo for a venue (Home / Explore cards).
// Requires GOOGLE_MAPS_API_KEY or GOOGLE_PLACES_API_KEY with Places API (New) enabled.
// Does not store photos. Guests allowed (verify_jwt = false); rate-limited.
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
const RATE_MAX = 90;
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
    "the",
    "and",
    "for",
    "near",
    "with",
    "from",
    "restaurant",
    "cafe",
    "food",
    "island",
    "park",
    "national",
    "of",
    "at",
    "in",
    "de",
    "la",
    "del",
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
  return compactA.length >= 6 && (compactB.includes(compactA.slice(0, 12)) || compactA.includes(compactB.slice(0, 12)));
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  photos?: Array<{ name?: string; authorAttributions?: unknown[] }>;
};

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const clientKey =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "anon";
  if (!checkRateLimit(clientKey)) {
    return new Response(JSON.stringify({ error: "Too many photo requests. Try again shortly." }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const apiKey =
    Deno.env.get("GOOGLE_MAPS_API_KEY")?.trim() ||
    Deno.env.get("GOOGLE_PLACES_API_KEY")?.trim() ||
    "";
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Google Places is not configured",
        code: "NO_GOOGLE_KEY",
      }),
      { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  let body: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    maxWidthPx?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const name = truncate(String(body.name ?? "").trim(), 120);
  const address = truncate(String(body.address ?? "").trim(), 160);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const maxWidthPx = Math.min(Math.max(Number(body.maxWidthPx) || 900, 200), 1600);

  if (name.length < 2 || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return new Response(JSON.stringify({ error: "name, latitude, and longitude are required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const textQuery = [name, address].filter(Boolean).join(", ");

  try {
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
      const detail = truncate(await searchRes.text(), 400);
      return new Response(
        JSON.stringify({
          error: "Google Places search failed",
          code: "GOOGLE_SEARCH",
          detail,
        }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const searchJson = (await searchRes.json()) as { places?: GooglePlace[] };
    const candidates = searchJson.places ?? [];
    const origin = { latitude, longitude };

    const match = candidates.find((place) => {
      const gName = place.displayName?.text ?? "";
      if (!namesLikelyMatch(name, gName)) return false;
      const gLat = place.location?.latitude;
      const gLng = place.location?.longitude;
      if (gLat == null || gLng == null) return true;
      return haversineMeters(origin, { latitude: gLat, longitude: gLng }) <= 12_000;
    });

    const photoName = match?.photos?.[0]?.name;
    if (!match || !photoName) {
      return new Response(JSON.stringify({ photo: null }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const mediaUrl =
      `https://places.googleapis.com/v1/${photoName}/media` +
      `?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;
    const mediaRes = await fetch(mediaUrl, {
      headers: { "X-Goog-Api-Key": apiKey },
    });
    if (!mediaRes.ok) {
      const detail = truncate(await mediaRes.text(), 400);
      return new Response(
        JSON.stringify({
          error: "Google Places photo failed",
          code: "GOOGLE_PHOTO",
          detail,
        }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const mediaJson = (await mediaRes.json()) as { photoUri?: string; name?: string };
    if (!mediaJson.photoUri) {
      return new Response(JSON.stringify({ photo: null }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let thumbUri = mediaJson.photoUri;
    if (maxWidthPx > 480) {
      const thumbRes = await fetch(
        `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=480&skipHttpRedirect=true`,
        { headers: { "X-Goog-Api-Key": apiKey } },
      );
      if (thumbRes.ok) {
        const thumbJson = (await thumbRes.json()) as { photoUri?: string };
        if (thumbJson.photoUri) thumbUri = thumbJson.photoUri;
      }
    }

    return new Response(
      JSON.stringify({
        photo: {
          url: mediaJson.photoUri,
          thumbUrl: thumbUri,
          title: match.displayName?.text ?? name,
          source: "google",
          placeId: match.id ?? null,
        },
      }),
      {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Place photo lookup failed",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
