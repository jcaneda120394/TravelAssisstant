// Supabase Edge Function: admin-update-user
// Allows verified admins to set another user's password / email / display name
// via the Auth Admin API (service role). Profile columns are updated by the client.
//
// Deploy:
//   npx supabase functions deploy admin-update-user --project-ref viyzvgdvnxhddtobpyys
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  userId?: string;
  password?: string;
  email?: string;
  fullName?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Missing Supabase environment." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization." }, 401);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized." }, 401);
    }

    const { data: adminRow, error: adminError } = await caller
      .from("profiles")
      .select("role, is_disabled")
      .eq("id", user.id)
      .maybeSingle();

    if (adminError || adminRow?.role !== "admin" || adminRow?.is_disabled) {
      return json({ error: "Admin access required." }, 403);
    }

    const body = (await req.json()) as Body;
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) {
      return json({ error: "userId is required." }, 400);
    }

    const patch: { password?: string; email?: string; user_metadata?: Record<string, string> } =
      {};
    if (typeof body.password === "string" && body.password.length >= 8) {
      patch.password = body.password;
    }
    if (typeof body.email === "string" && body.email.includes("@")) {
      patch.email = body.email.trim().toLowerCase();
    }
    if (typeof body.fullName === "string" && body.fullName.trim()) {
      patch.user_metadata = { full_name: body.fullName.trim() };
    }

    if (!patch.password && !patch.email && !patch.user_metadata) {
      return json({ error: "Provide password, email, and/or fullName." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.auth.admin.updateUserById(userId, patch);
    if (error) {
      return json({ error: error.message }, 400);
    }

    // Keep profiles.email / full_name in sync when Auth metadata changed.
    const profilePatch: Record<string, string> = {};
    if (patch.email) profilePatch.email = patch.email;
    if (patch.user_metadata?.full_name) profilePatch.full_name = patch.user_metadata.full_name;
    if (Object.keys(profilePatch).length) {
      await admin.from("profiles").update(profilePatch).eq("id", userId);
    }

    return json({ ok: true, userId: data.user?.id ?? userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
