// Supabase Edge Function: stock-photos / travel-image resolver
// Sequential: Pexels → Unsplash → Openverse → Wikimedia → (client fallback)
// Secrets: PEXELS_API_KEY, UNSPLASH_ACCESS_KEY (never expose to Expo client)
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

type TravelImage = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  provider: "pexels" | "unsplash" | "openverse" | "wikimedia";
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  attribution?: string;
  license?: string;
  alt: string;
  searchQuery: string;
};

function isExcluded(url: string, exclude: string[]): boolean {
  const clean = url.split("?")[0]!;
  return exclude.some((e) => {
    const b = e.split("?")[0]!;
    return b === clean || url.includes(b) || b.includes(clean);
  });
}

const IRRELEVANT_FOR_FOOD =
  /\b(memorial|monument|war|veteran|cemetery|grave|traveling wall|vietnam wall|battlefield|soldier|tomb)\b/i;

const IRRELEVANT_FOR_LANDMARK =
  /\b(bus|buses|jeepney|coach|transit|terminal|vehicle|truck|van|motorcycle|parking lot)\b/i;

const WEAK_LANDMARK_TOKENS = new Set([
  "church", "cathedral", "basilica", "temple", "shrine", "mosque",
  "park", "museum", "palace", "castle", "tower", "bridge", "market",
  "plaza", "garden", "beach", "hotel", "resort",
]);

const GEO_STOP = new Set([
  "the", "and", "vietnam", "japan", "philippines", "thailand", "indonesia",
  "city", "town", "street", "travel", "food", "dining", "interior", "shop",
  "speciality", "specialty", "special", "landmark", "building",
]);

function isBusiness(type: string | null | undefined): boolean {
  return /^(restaurant|cafe|bakery|hotel|resort|nightlife)$/i.test(String(type ?? ""));
}

function significantTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !GEO_STOP.has(t));
}

function typeHints(type: string | null | undefined): string[] {
  const t = String(type ?? "").toLowerCase();
  if (t === "cafe") return ["cafe", "coffee", "espresso", "latte"];
  if (t === "restaurant") return ["restaurant", "dining", "kitchen", "eatery"];
  if (t === "bakery") return ["bakery", "pastry", "bread"];
  if (t === "hotel" || t === "resort") return ["hotel", "resort", "lobby"];
  if (t === "temple") return ["temple", "shrine", "church", "cathedral", "basilica"];
  return [];
}

function relevantToPlace(
  img: TravelImage,
  placeName: string,
  placeType: string | null | undefined,
): boolean {
  // Alt only — searchQuery embeds the place name and would accept unrelated stock.
  const hay = `${img.alt}`.toLowerCase();
  if (isBusiness(placeType) && IRRELEVANT_FOR_FOOD.test(hay)) return false;
  const landmarkish =
    !isBusiness(placeType) &&
    /^(temple|attraction|museum|park|viewpoint|landmark|activity|beach|zoo)$/i.test(
      String(placeType ?? ""),
    );
  if (landmarkish && IRRELEVANT_FOR_LANDMARK.test(hay)) return false;

  const tokens = significantTokens(placeName);
  const distinctive = tokens.filter((t) => !WEAK_LANDMARK_TOKENS.has(t));
  if (distinctive.length >= 1) {
    if (distinctive.some((t) => hay.includes(t))) return true;
  } else if (tokens.some((t) => hay.includes(t))) {
    return true;
  }

  const hints = typeHints(placeType);
  if (isBusiness(placeType) && hints.some((h) => hay.includes(h))) {
    return !IRRELEVANT_FOR_FOOD.test(hay);
  }
  return false;
}

function acceptable(
  img: TravelImage,
  excludeUrls: string[],
  excludeIds: string[],
  placeName: string,
  placeType: string | null | undefined,
): boolean {
  if (!img.url || !/^https?:\/\//i.test(img.url)) return false;
  if (/\.svg(\?|$)/i.test(img.url)) return false;
  if (excludeIds.includes(img.id)) return false;
  if (isExcluded(img.url, excludeUrls)) return false;
  if (img.width != null && img.width > 0 && img.width < 640) return false;
  if (!relevantToPlace(img, placeName, placeType)) return false;
  return true;
}

async function pexels(query: string, key: string): Promise<TravelImage[]> {
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&per_page=12&orientation=landscape&size=large`;
  const res = await fetch(url, {
    headers: { Authorization: key, Accept: "application/json" },
  });
  if (res.status === 429) return [];
  if (!res.ok) return [];
  const data = await res.json() as {
    photos?: Array<{
      id?: number;
      alt?: string;
      photographer?: string;
      photographer_url?: string;
      url?: string;
      width?: number;
      height?: number;
      src?: { large2x?: string; large?: string; medium?: string; small?: string };
    }>;
  };
  return (data.photos ?? [])
    .map((item) => {
      const full = item.src?.large2x ?? item.src?.large ?? item.src?.medium;
      if (!full) return null;
      const photographer = item.photographer?.trim();
      return {
        id: `pexels:${item.id ?? full}`,
        url: full,
        thumbnailUrl: item.src?.medium ?? item.src?.small ?? full,
        width: item.width,
        height: item.height,
        provider: "pexels" as const,
        photographer,
        photographerUrl: item.photographer_url,
        sourceUrl: item.url,
        attribution: photographer ? `${photographer} · Pexels` : "Pexels",
        alt: item.alt || photographer || query,
        searchQuery: query,
      };
    })
    .filter((p): p is TravelImage => Boolean(p));
}

async function unsplash(query: string, key: string): Promise<TravelImage[]> {
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=12&orientation=landscape&content_filter=high`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
      Accept: "application/json",
    },
  });
  if (res.status === 429) return [];
  if (!res.ok) return [];
  const data = await res.json() as {
    results?: Array<{
      id?: string;
      description?: string | null;
      alt_description?: string | null;
      width?: number;
      height?: number;
      user?: { name?: string; links?: { html?: string } };
      urls?: { regular?: string; small?: string; thumb?: string; raw?: string };
      links?: { html?: string };
    }>;
  };
  return (data.results ?? [])
    .map((item) => {
      const full = item.urls?.regular ?? item.urls?.raw;
      if (!full) return null;
      const photographer = item.user?.name?.trim();
      return {
        id: `unsplash:${item.id ?? full}`,
        url: full,
        thumbnailUrl: item.urls?.small ?? item.urls?.thumb ?? full,
        width: item.width,
        height: item.height,
        provider: "unsplash" as const,
        photographer,
        photographerUrl: item.user?.links?.html,
        sourceUrl: item.links?.html,
        attribution: photographer ? `${photographer} · Unsplash` : "Unsplash",
        alt: item.alt_description || item.description || photographer || query,
        searchQuery: query,
      };
    })
    .filter((p): p is TravelImage => Boolean(p));
}

async function openverse(query: string): Promise<TravelImage[]> {
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}` +
    `&page_size=12&category=photograph&mature=false&filter_dead=true`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TravelAssistant/1.0 (stock-photos edge)",
    },
  });
  if (res.status === 429) return [];
  if (!res.ok) return [];
  const data = await res.json() as {
    results?: Array<{
      id?: string | number;
      title?: string;
      url?: string;
      thumbnail?: string;
      creator?: string;
      creator_url?: string;
      license?: string;
      license_version?: string;
      foreign_landing_url?: string;
      width?: number;
      height?: number;
    }>;
  };
  return (data.results ?? [])
    .filter((item) => item.url)
    .map((item) => {
      const license = [item.license, item.license_version].filter(Boolean).join(" ").trim();
      const photographer = item.creator?.trim();
      return {
        id: `openverse:${item.id ?? item.url}`,
        url: item.url!,
        thumbnailUrl: item.thumbnail ?? item.url,
        width: item.width,
        height: item.height,
        provider: "openverse" as const,
        photographer,
        photographerUrl: item.creator_url,
        sourceUrl: item.foreign_landing_url,
        license: license || undefined,
        attribution: photographer
          ? `${photographer} · Openverse${license ? ` · ${license}` : ""}`
          : `Openverse${license ? ` · ${license}` : ""}`,
        alt: item.title || query,
        searchQuery: query,
      };
    });
}

async function wikimedia(query: string): Promise<TravelImage[]> {
  const commonsUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=10&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1200`;
  const res = await fetch(commonsUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TravelAssistant/1.0 (stock-photos edge)",
    },
  });
  if (!res.ok) return [];
  const data = await res.json() as {
    query?: {
      pages?: Record<
        string,
        {
          pageid?: number;
          title?: string;
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            width?: number;
            height?: number;
            mime?: string;
            descriptionurl?: string;
          }>;
        }
      >;
    };
  };
  const out: TravelImage[] = [];
  for (const page of Object.values(data.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    if (info.mime && !info.mime.startsWith("image/")) continue;
    if (/\.svg(\?|$)/i.test(info.url)) continue;
    out.push({
      id: `wikimedia:${page.pageid ?? info.url}`,
      url: info.url,
      thumbnailUrl: info.thumburl ?? info.url,
      width: info.width,
      height: info.height,
      provider: "wikimedia",
      sourceUrl: info.descriptionurl,
      attribution: "Wikimedia Commons",
      license: "Wikimedia",
      alt: page.title?.replace(/^File:/, "") || query,
      searchQuery: query,
    });
  }
  return out;
}

type ProviderFn = (query: string) => Promise<TravelImage[]>;

async function resolveSequential(params: {
  queries: string[];
  excludeUrls: string[];
  excludeIds: string[];
  placeName: string;
  placeType: string | null;
}): Promise<{ image: TravelImage | null; providerTried: string[] }> {
  const pexelsKey = Deno.env.get("PEXELS_API_KEY")?.trim() ?? "";
  const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY")?.trim() ?? "";

  const providers: Array<{ name: string; run: ProviderFn }> = [];
  if (pexelsKey) {
    providers.push({ name: "pexels", run: (q) => pexels(q, pexelsKey) });
  }
  if (unsplashKey) {
    providers.push({ name: "unsplash", run: (q) => unsplash(q, unsplashKey) });
  }
  providers.push({ name: "openverse", run: openverse });
  providers.push({ name: "wikimedia", run: wikimedia });

  const providerTried: string[] = [];

  for (const provider of providers) {
    providerTried.push(provider.name);
    for (const query of params.queries) {
      try {
        console.log(`[TravelImage] Searching ${provider.name}: ${query}`);
        const candidates = await provider.run(query);
        const hit = candidates.find((img) =>
          acceptable(
            img,
            params.excludeUrls,
            params.excludeIds,
            params.placeName,
            params.placeType,
          )
        );
        if (hit) {
          console.log(`[TravelImage] ${provider.name} found image.`);
          return { image: hit, providerTried };
        }
        console.log(`[TravelImage] ${provider.name} returned no result for query.`);
      } catch (error) {
        console.log(`[TravelImage] ${provider.name} error — skipping.`, String(error));
      }
    }
  }

  return { image: null, providerTried };
}

function buildQueries(body: {
  queries?: string[];
  name?: string;
  city?: string | null;
  country?: string | null;
  type?: string | null;
  query?: string;
}): string[] {
  if (Array.isArray(body.queries) && body.queries.length) {
    return body.queries.map((q) => String(q).trim()).filter((q) => q.length >= 2).slice(0, 8);
  }
  const name = String(body.name ?? body.query ?? "").trim();
  const city = String(body.city ?? "").trim();
  const country = String(body.country ?? "").trim();
  const type = String(body.type ?? "attraction").trim();
  const business = /^(restaurant|cafe|bakery|hotel|resort|nightlife)$/i.test(type);
  const keywords =
    /cafe/i.test(type)
      ? "cafe coffee shop interior"
      : /restaurant|food/i.test(type)
      ? "restaurant food dining"
      : /hotel|resort/i.test(type)
      ? "hotel building exterior"
      : /beach/i.test(type)
      ? "beach travel"
      : /temple/i.test(type)
      ? "church cathedral basilica temple shrine"
      : "travel landmark";

  const ladder = business
    ? [
      [name, city, keywords].filter(Boolean).join(" "),
      [name, city, country].filter(Boolean).join(" "),
      [name, city].filter(Boolean).join(" "),
      [name, keywords].filter(Boolean).join(" "),
      city ? `${city} ${keywords}` : "",
    ]
    : [
      [name, city, country, keywords].filter(Boolean).join(" "),
      [name, city, country].filter(Boolean).join(" "),
      [name, city].filter(Boolean).join(" "),
      city ? `${city} ${keywords}` : "",
      name,
    ];

  return [
    ...new Set(
      ladder.map((q) => q.replace(/\s+/g, " ").trim()).filter((q) => q.length >= 3),
    ),
  ];
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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = String(body.action ?? "resolve");
  const queries = buildQueries(body as {
    queries?: string[];
    name?: string;
    city?: string | null;
    country?: string | null;
    type?: string | null;
    query?: string;
  });
  const excludeUrls = Array.isArray(body.excludeImageUrls)
    ? body.excludeImageUrls.map(String)
    : [];
  const excludeIds = Array.isArray(body.excludeImageIds)
    ? body.excludeImageIds.map(String)
    : [];

  if (queries.length === 0) {
    return new Response(JSON.stringify({ success: false, error: "query required", image: null }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Legacy fan-out still supported for older clients.
  if (action === "search") {
    const open = await openverse(queries[0]!).catch(() => []);
    return new Response(
      JSON.stringify({
        photos: open.map((img) => ({
          url: img.url,
          thumbUrl: img.thumbnailUrl,
          title: img.alt,
          source: img.provider,
          attribution: img.attribution,
          photographer: img.photographer,
        })),
        providers: ["openverse"],
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const { image, providerTried } = await resolveSequential({
    queries,
    excludeUrls,
    excludeIds,
    placeName: String(body.name ?? body.query ?? queries[0] ?? ""),
    placeType: body.type != null ? String(body.type) : null,
  });

  return new Response(
    JSON.stringify({
      success: Boolean(image),
      image,
      providerTried,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
