// Supabase Edge Function: ai-chat
// Free-friendly: prefers GROQ_API_KEY, then OPENAI_API_KEY, else tool-summary fallback.
//
// Deploy:
//   npx supabase login
//   npx supabase link --project-ref viyzvgdvnxhddtobpyys
//   npx supabase functions deploy ai-chat
//   npx supabase secrets set GROQ_API_KEY=gsk_...
//
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role?: string; content?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const toolSummary = typeof body.toolSummary === "string" ? body.toolSummary : "";
    const mode = typeof body.mode === "string" ? body.mode : "ask";
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];

    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    const systemPrompt =
      "You are TravelAssistant. Use the provided tool results as factual ground truth. Do not invent live transit times, fares, hotel rates, or opening hours that are not in the tool results.";

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content ?? ""),
      })),
      {
        role: "user",
        content: `Tool results:\n${toolSummary || "(none)"}\n\nRespond helpfully for mode=${mode}.`,
      },
    ];

    // 1) Groq (free tier) — OpenAI-compatible API
    // llama-3.3-70b-versatile was shut down for free/dev tiers (Aug 2026).
    if (groqKey) {
      const preferred = Deno.env.get("GROQ_MODEL");
      const groqModels = [
        preferred,
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b",
      ].filter((m): m is string => Boolean(m));

      let lastError = "";
      for (const model of groqModels) {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: chatMessages,
            temperature: 0.4,
          }),
        });
        if (response.ok) {
          const payload = await response.json();
          const content = payload.choices?.[0]?.message?.content ?? "No response from Groq.";
          return new Response(
            JSON.stringify({ message: content, provider: "groq", model }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        lastError = await response.text();
        if (!/model_not_found|does not exist/i.test(lastError)) {
          break;
        }
      }

      return new Response(JSON.stringify({ error: lastError || "Groq request failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) OpenAI
    if (openAiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: chatMessages,
          temperature: 0.4,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content ?? "No response from OpenAI.";
      return new Response(JSON.stringify({ message: content, provider: "openai" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Gemini free tier
    if (geminiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\nMode: ${mode}\n\nConversation:\n${messages
                      .map((m) => `${m.role}: ${m.content}`)
                      .join("\n")}\n\nTool results:\n${toolSummary}`,
                  },
                ],
              },
            ],
          }),
        },
      );
      if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: errText }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payload = await response.json();
      const content =
        payload.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ??
        "No response from Gemini.";
      return new Response(JSON.stringify({ message: content, provider: "gemini" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) No LLM key — still useful tool-backed reply
    return new Response(
      JSON.stringify({
        message: [
          `TravelAssistant AI (${mode}) — tool-backed reply (no LLM secret configured).`,
          "",
          "Set GROQ_API_KEY (free), GEMINI_API_KEY (free), or OPENAI_API_KEY in Supabase Edge Function secrets for natural-language answers.",
          "",
          toolSummary || "No tool results.",
        ].join("\n"),
        provider: "tools-only",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
