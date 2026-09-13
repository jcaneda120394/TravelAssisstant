// Supabase Edge Function: admin-update-user
// Verified admins only. Updates Auth user via service role.
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? "")
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
const RATE_MAX = 10;
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

type Body = {
  userId?: string;
  password?: string;
  email?: string;
  fullName?: string;
};

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

    const { data: adminRow, error: adminError } = await caller
      .from("profiles")
      .select("role, is_disabled")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError || adminRow?.role !== "admin" || adminRow?.is_disabled) {
      return json({ error: "Admin access required" }, 403, corsHeaders);
    }

    const body = (await req.json()) as Body;
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return json({ error: "Invalid userId" }, 400, corsHeaders);
    }

    const patch: {
      password?: string;
      email?: string;
      user_metadata?: Record<string, string>;
    } = {};

    if (typeof body.password === "string") {
      if (body.password.length < 8 || body.password.length > 128) {
        return json({ error: "Password must be 8–128 characters" }, 400, corsHeaders);
      }
      patch.password = body.password;
    }
    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return json({ error: "Invalid email" }, 400, corsHeaders);
      }
      patch.email = email;
    }
    if (typeof body.fullName === "string") {
      const fullName = body.fullName.trim().slice(0, 80);
      if (fullName) {
        patch.user_metadata = { full_name: fullName };
      }
    }

    if (!patch.password && !patch.email && !patch.user_metadata) {
      return json({ error: "Provide password, email, and/or fullName" }, 400, corsHeaders);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.auth.admin.updateUserById(userId, patch);
    if (error) {
      console.error("admin-update-user failed", error.message);
      return json({ error: "Unable to update user" }, 400, corsHeaders);
    }

    const profilePatch: Record<string, string> = {};
    if (patch.email) profilePatch.email = patch.email;
    if (patch.user_metadata?.full_name) profilePatch.full_name = patch.user_metadata.full_name;
    if (Object.keys(profilePatch).length) {
      await admin.from("profiles").update(profilePatch).eq("id", userId);
    }

    console.log(
      JSON.stringify({
        event: "admin_update_user",
        adminId: user.id,
        targetId: userId,
        fields: Object.keys(patch),
        at: new Date().toISOString(),
      }),
    );

    return json({ ok: true, userId: data.user?.id ?? userId }, 200, corsHeaders);
  } catch (error) {
    console.error("admin-update-user unexpected", error);
    return json({ error: "Unexpected error" }, 500, corsHeaders);
  }
});

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
