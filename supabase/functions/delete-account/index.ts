// Supabase Edge Function: delete-account
// Authenticated user deletes their own Auth user (cascades profile + owned data via FKs).
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("DELETE_ACCOUNT_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DEFAULT_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8081",
  "https://travelassistant-umber.vercel.app",
];

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowList = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;
  const allowOrigin = allowList.includes(origin) ? origin : allowList[0]!;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 3;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX) return false;
  bucket.count += 1;
  return true;
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Service unavailable" }, 500, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    if (!checkRateLimit(user.id)) {
      return json({ error: "Too many requests" }, 429, corsHeaders);
    }

    // Optional confirmation token from body — must match user id to reduce CSRF-ish mistakes
    let confirmUserId = "";
    try {
      const body = await req.json();
      confirmUserId = typeof body?.confirmUserId === "string" ? body.confirmUserId : "";
    } catch {
      confirmUserId = "";
    }
    if (confirmUserId && confirmUserId !== user.id) {
      return json({ error: "Confirmation mismatch" }, 400, corsHeaders);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("delete-account failed", error.message);
      return json({ error: "Unable to delete account" }, 400, corsHeaders);
    }

    console.log(
      JSON.stringify({
        event: "account_deleted",
        userId: user.id,
        at: new Date().toISOString(),
      }),
    );

    return json({ ok: true }, 200, corsHeaders);
  } catch (error) {
    console.error("delete-account unexpected", error);
    return json({ error: "Unexpected error" }, 500, corsHeaders);
  }
});

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
