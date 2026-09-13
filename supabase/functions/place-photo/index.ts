// Backward-compatible photo endpoint. Prefer `google-places` with action:"photo".
// Keeps existing place-photo clients working with the same Google key.
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

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Forward to the unified google-places function in-process by re-posting
  // would need the service URL; instead duplicate a thin photo-only call.
  const apiKey =
    Deno.env.get("GOOGLE_MAPS_API_KEY")?.trim() ||
    Deno.env.get("GOOGLE_PLACES_API_KEY")?.trim() ||
    "";
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Google Places is not configured", code: "NO_GOOGLE_KEY" }),
      { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  // Delegate via internal function URL when available.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  if (supabaseUrl) {
    const forward = await fetch(`${supabaseUrl}/functions/v1/google-places`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("Authorization") ?? "",
        apikey: req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
      body: JSON.stringify({ action: "photo", ...body }),
    });
    const text = await forward.text();
    return new Response(text, {
      status: forward.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ error: "google-places function unavailable", code: "NO_FORWARD" }),
    { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
