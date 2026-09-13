// Supabase Edge Function: scan-translate
// OCR + translate a scanned menu / sign photo. Does not store images.
// Prefer OPENAI_API_KEY (vision), then GEMINI_API_KEY, then GROQ vision models.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("AI_CHAT_ALLOWED_ORIGINS") ?? "")
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
const RATE_MAX = 12;
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

function languageName(code: string): string {
  const map: Record<string, string> = {
    en: "English",
    fil: "Filipino",
    tl: "Filipino",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
  };
  return map[code] ?? map[code.split("-")[0] ?? ""] ?? code;
}

function parseJsonPayload(raw: string): {
  originalText?: string;
  translatedText?: string;
  detectedLanguage?: string;
} | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    let rateKey = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";

    if (supabaseUrl && anonKey && authHeader) {
      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
      } = await caller.auth.getUser();
      if (user) {
        rateKey = user.id;
        const { data: profile } = await caller
          .from("profiles")
          .select("is_disabled")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.is_disabled) {
          return new Response(JSON.stringify({ error: "Account disabled" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (!checkRateLimit(rateKey)) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const mimeType =
      typeof body.mimeType === "string" && body.mimeType.startsWith("image/")
        ? body.mimeType
        : "image/jpeg";
    const targetLang = typeof body.targetLang === "string" ? body.targetLang.slice(0, 16) : "en";
    const plainText = typeof body.text === "string" ? truncate(body.text.trim(), 8_000) : "";

    if (!imageBase64 && !plainText) {
      return new Response(JSON.stringify({ error: "Provide an image or text to translate." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Keep payloads small (menus). Base64 of ~1.2MB raw ≈ 1.6M chars.
    if (imageBase64.length > 1_800_000) {
      return new Response(JSON.stringify({ error: "Image too large. Try a closer crop." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetName = languageName(targetLang);
    const instruction = plainText
      ? `Translate the following traveler text into ${targetName} (${targetLang}). ` +
        `Return ONLY JSON: {"originalText":"...","translatedText":"...","detectedLanguage":"code"}. ` +
        `Text:\n${plainText}`
      : `You help travelers read menus, signs, and labels. ` +
        `Read ALL visible text in the image (preserve line breaks for menus). ` +
        `Translate it into ${targetName} (${targetLang}). ` +
        `Return ONLY JSON: {"originalText":"...","translatedText":"...","detectedLanguage":"code"}. ` +
        `If no text is visible, set originalText and translatedText to empty strings.`;

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    if (openAiKey) {
      const content: Array<Record<string, unknown>> = [{ type: "text", text: instruction }];
      if (imageBase64) {
        content.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        });
      }
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content }],
          temperature: 0.1,
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const raw = String(payload.choices?.[0]?.message?.content ?? "");
        const parsed = parseJsonPayload(raw);
        if (parsed?.translatedText != null || parsed?.originalText != null) {
          return new Response(
            JSON.stringify({
              originalText: String(parsed.originalText ?? ""),
              translatedText: String(parsed.translatedText ?? ""),
              detectedLanguage: String(parsed.detectedLanguage ?? ""),
              provider: "openai",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    if (geminiKey) {
      const parts: Array<Record<string, unknown>> = [{ text: instruction }];
      if (imageBase64) {
        parts.unshift({
          inline_data: { mime_type: mimeType, data: imageBase64 },
        });
      }
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts }] }),
        },
      );
      if (response.ok) {
        const payload = await response.json();
        const raw =
          payload.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ??
          "";
        const parsed = parseJsonPayload(raw);
        if (parsed?.translatedText != null || parsed?.originalText != null) {
          return new Response(
            JSON.stringify({
              originalText: String(parsed.originalText ?? ""),
              translatedText: String(parsed.translatedText ?? ""),
              detectedLanguage: String(parsed.detectedLanguage ?? ""),
              provider: "gemini",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    if (groqKey && imageBase64) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("GROQ_VISION_MODEL") || "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: instruction },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
              ],
            },
          ],
          temperature: 0.1,
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        const raw = String(payload.choices?.[0]?.message?.content ?? "");
        const parsed = parseJsonPayload(raw);
        if (parsed?.translatedText != null || parsed?.originalText != null) {
          return new Response(
            JSON.stringify({
              originalText: String(parsed.originalText ?? ""),
              translatedText: String(parsed.translatedText ?? ""),
              detectedLanguage: String(parsed.detectedLanguage ?? ""),
              provider: "groq",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Text-only free fallback via MyMemory when no vision provider is configured.
    if (plainText) {
      const url =
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(plainText.slice(0, 450))}` +
        `&langpair=autodetect|${encodeURIComponent(targetLang)}`;
      const response = await fetch(url);
      if (response.ok) {
        const payload = await response.json();
        const translated = String(payload?.responseData?.translatedText ?? "");
        return new Response(
          JSON.stringify({
            originalText: plainText,
            translatedText: translated,
            detectedLanguage: "",
            provider: "mymemory",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({
        error:
          "Scan translate is unavailable. Configure OPENAI_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY on the scan-translate function.",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
