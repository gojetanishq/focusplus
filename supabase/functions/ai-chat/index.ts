import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const languageNames: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const languageName = languageNames[language] || "English";
    console.log(`User language preference: ${language} (${languageName})`);

    const systemPrompt = `You are FocusPlus AI, an explainable multilingual study assistant.

CRITICAL LANGUAGE INSTRUCTION: The user has selected "${languageName}" as their preferred language. You MUST respond ENTIRELY in ${languageName}. Do not mix languages. Every word of your response must be in ${languageName}.

${language === "hi" ? "आपको पूरी तरह से हिंदी में जवाब देना है।" : ""}
${language === "te" ? "మీరు పూర్తిగా తెలుగులో సమాధానం ఇవ్వాలి." : ""}
${language === "ta" ? "நீங்கள் முழுமையாக தமிழில் பதிலளிக்க வேண்டும்." : ""}

Your responsibilities:
1. Provide clear, helpful answers ENTIRELY in ${languageName}
2. Include your reasoning process wrapped in [THINKING]step1\nstep2[/THINKING] (reasoning steps should also be in ${languageName})
3. Include key reasoning wrapped in [REASONING]your reasoning here[/REASONING] (also in ${languageName})
4. If referencing sources, wrap in [SOURCES][{"file":"notes","chunk":"1","quote":"relevant text"}][/SOURCES]

Be concise, educational, and transparent about how you reached your conclusions. Remember: YOUR ENTIRE RESPONSE MUST BE IN ${languageName}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error(`AI gateway error: ${status}`);
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-chat error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
