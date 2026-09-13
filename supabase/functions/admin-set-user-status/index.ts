// Supabase Edge Function: admin-set-user-status
// Admins enable/disable accounts. Disabling revokes all Auth sessions globally.
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

    const { data: adminRow } = await caller
      .from("profiles")
      .select("role, is_disabled")
      .eq("id", user.id)
      .maybeSingle();
    if (adminRow?.role !== "admin" || adminRow?.is_disabled) {
      return json({ error: "Admin access required" }, 403, corsHeaders);
    }

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const disabled = Boolean(body.disabled);
    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return json({ error: "Invalid userId" }, 400, corsHeaders);
    }
    if (userId === user.id && disabled) {
      return json({ error: "Cannot disable your own admin account" }, 400, corsHeaders);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: profileError } = await admin
      .from("profiles")
      .update({ is_disabled: disabled })
      .eq("id", userId);
    if (profileError) {
      console.error("admin-set-user-status profile", profileError.message);
      return json({ error: "Unable to update account status" }, 400, corsHeaders);
    }

    if (disabled) {
      // Revoke all refresh tokens / sessions for this user.
      const { error: signOutError } = await admin.auth.admin.signOut(userId, "global");
      if (signOutError) {
        console.error("admin-set-user-status signOut", signOutError.message);
        // Profile already disabled; still report partial success with warning.
        return json(
          { ok: true, disabled: true, sessionsRevoked: false, warning: "Status updated; session revoke failed" },
          200,
          corsHeaders,
        );
      }

      // Ban further sign-in until re-enabled (cleared on enable).
      const { error: banError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (banError) {
        console.error("admin-set-user-status ban", banError.message);
      }
    } else {
      const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
      if (unbanError) {
        console.error("admin-set-user-status unban", unbanError.message);
      }
    }

    console.log(
      JSON.stringify({
        event: "admin_set_user_status",
        adminId: user.id,
        targetId: userId,
        disabled,
        at: new Date().toISOString(),
      }),
    );

    return json({ ok: true, disabled, sessionsRevoked: disabled }, 200, corsHeaders);
  } catch (error) {
    console.error("admin-set-user-status unexpected", error);
    return json({ error: "Unexpected error" }, 500, corsHeaders);
  }
});

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
