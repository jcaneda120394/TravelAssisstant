// Supabase Edge Function: stock-photos
// Free travel photography from Pexels, Unsplash, Pixabay, Flickr (+ Openverse).
// Guests allowed (verify_jwt = false). Set optional secrets:
//   PEXELS_API_KEY, UNSPLASH_ACCESS_KEY, PIXABAY_API_KEY, FLICKR_API_KEY
// Openverse needs no key and always runs.
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

type StockPhoto = {
  url: string;
  thumbUrl?: string;
  title?: string;
  source: string;
  attribution?: string;
  photographer?: string;
};

async function openverse(query: string, limit: number): Promise<StockPhoto[]> {
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}` +
    `&page_size=${Math.min(limit, 20)}&category=photograph&mature=false&filter_dead=true`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TravelMateAI/1.0 (stock-photos edge)",
    },
  });
  if (!res.ok) return [];
  const data = await res.json() as {
    results?: Array<{
      title?: string;
      url?: string;
      thumbnail?: string;
      creator?: string;
      license?: string;
    }>;
  };
  return (data.results ?? [])
    .filter((item) => item.url)
    .map((item) => ({
      url: item.url!,
      thumbUrl: item.thumbnail ?? item.url,
      title: item.title,
      source: "openverse",
      photographer: item.creator,
      attribution: item.creator
        ? `${item.creator} · Openverse${item.license ? ` · ${item.license}` : ""}`
        : `Openverse${item.license ? ` · ${item.license}` : ""}`,
    }));
}

async function pexels(query: string, limit: number, key: string): Promise<StockPhoto[]> {
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&per_page=${Math.min(limit, 15)}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: key, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json() as {
    photos?: Array<{
      alt?: string;
      photographer?: string;
      src?: { large2x?: string; large?: string; medium?: string; small?: string };
    }>;
  };
  return (data.photos ?? [])
    .map((item) => {
      const full = item.src?.large2x ?? item.src?.large ?? item.src?.medium;
      if (!full) return null;
      return {
        url: full,
        thumbUrl: item.src?.medium ?? item.src?.small ?? full,
        title: item.alt || item.photographer || "Pexels photo",
        source: "pexels",
        photographer: item.photographer,
        attribution: item.photographer ? `${item.photographer} · Pexels` : "Pexels",
      } satisfies StockPhoto;
    })
    .filter((p): p is StockPhoto => Boolean(p));
}

async function unsplash(query: string, limit: number, key: string): Promise<StockPhoto[]> {
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=${Math.min(limit, 15)}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const data = await res.json() as {
    results?: Array<{
      description?: string | null;
      alt_description?: string | null;
      user?: { name?: string };
      urls?: { regular?: string; small?: string; thumb?: string; raw?: string };
    }>;
  };
  return (data.results ?? [])
    .map((item) => {
      const full = item.urls?.regular ?? item.urls?.raw;
      if (!full) return null;
      const photographer = item.user?.name;
      return {
        url: full,
        thumbUrl: item.urls?.small ?? item.urls?.thumb ?? full,
        title: item.alt_description || item.description || photographer || "Unsplash photo",
        source: "unsplash",
        photographer,
        attribution: photographer ? `${photographer} · Unsplash` : "Unsplash",
      } satisfies StockPhoto;
    })
    .filter((p): p is StockPhoto => Boolean(p));
}

async function pixabay(query: string, limit: number, key: string): Promise<StockPhoto[]> {
  const url =
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(query)}&image_type=photo&safesearch=true` +
    `&orientation=horizontal&per_page=${Math.min(Math.max(limit, 3), 20)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json() as {
    hits?: Array<{
      largeImageURL?: string;
      webformatURL?: string;
      previewURL?: string;
      tags?: string;
      user?: string;
    }>;
  };
  return (data.hits ?? [])
    .map((item) => {
      const full = item.largeImageURL ?? item.webformatURL;
      if (!full) return null;
      return {
        url: full,
        thumbUrl: item.webformatURL ?? item.previewURL ?? full,
        title: item.tags || item.user || "Pixabay photo",
        source: "pixabay",
        photographer: item.user,
        attribution: item.user ? `${item.user} · Pixabay` : "Pixabay",
      } satisfies StockPhoto;
    })
    .filter((p): p is StockPhoto => Boolean(p));
}

async function flickr(query: string, limit: number, key: string): Promise<StockPhoto[]> {
  const url =
    `https://www.flickr.com/services/rest/?method=flickr.photos.search` +
    `&api_key=${encodeURIComponent(key)}` +
    `&text=${encodeURIComponent(query)}` +
    `&license=4,5,6,9,10&safe_search=1&content_type=1&media=photos` +
    `&extras=url_c,url_l,url_m,url_n,owner_name` +
    `&per_page=${Math.min(limit, 20)}&format=json&nojsoncallback=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json() as {
    stat?: string;
    photos?: {
      photo?: Array<{
        title?: string;
        ownername?: string;
        url_c?: string;
        url_l?: string;
        url_m?: string;
        url_n?: string;
      }>;
    };
  };
  if (data.stat === "fail") return [];
  return (data.photos?.photo ?? [])
    .map((item) => {
      const full = item.url_l ?? item.url_c ?? item.url_m;
      if (!full) return null;
      return {
        url: full,
        thumbUrl: item.url_n ?? item.url_m ?? full,
        title: item.title || item.ownername || "Flickr photo",
        source: "flickr",
        photographer: item.ownername,
        attribution: item.ownername ? `${item.ownername} · Flickr (CC)` : "Flickr (CC)",
      } satisfies StockPhoto;
    })
    .filter((p): p is StockPhoto => Boolean(p));
}

function dedupe(photos: StockPhoto[]): StockPhoto[] {
  const seen = new Set<string>();
  return photos.filter((photo) => {
    const key = photo.url.split("?")[0]!;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const clientKey =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("cf-connecting-ip") ??
    "anon";
  if (!checkRateLimit(clientKey)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { query?: string; limit?: number } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const query = String(body.query ?? "").trim().slice(0, 120);
  const limit = Math.min(Math.max(Number(body.limit) || 8, 1), 20);
  if (query.length < 2) {
    return new Response(JSON.stringify({ photos: [], error: "query required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const pexelsKey = Deno.env.get("PEXELS_API_KEY")?.trim() ?? "";
  const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY")?.trim() ?? "";
  const pixabayKey = Deno.env.get("PIXABAY_API_KEY")?.trim() ?? "";
  const flickrKey = Deno.env.get("FLICKR_API_KEY")?.trim() ?? "";

  const tasks: Array<Promise<StockPhoto[]>> = [openverse(query, limit)];
  const providers = ["openverse"];
  if (pexelsKey) {
    providers.push("pexels");
    tasks.push(pexels(query, limit, pexelsKey));
  }
  if (unsplashKey) {
    providers.push("unsplash");
    tasks.push(unsplash(query, limit, unsplashKey));
  }
  if (pixabayKey) {
    providers.push("pixabay");
    tasks.push(pixabay(query, limit, pixabayKey));
  }
  if (flickrKey) {
    providers.push("flickr");
    tasks.push(flickr(query, limit, flickrKey));
  }

  const batches = await Promise.all(
    tasks.map((task) => task.catch(() => [] as StockPhoto[])),
  );
  const photos = dedupe(batches.flat()).slice(0, Math.max(limit, 12));

  return new Response(JSON.stringify({ photos, providers }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
