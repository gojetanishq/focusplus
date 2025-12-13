import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const languageNames: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskTitle, taskDescription, taskSubject, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const langName = languageNames[language] || "English";

    const systemPrompt = `You are an educational difficulty analyzer. Given a task or topic, analyze its difficulty level for students.

CRITICAL: You MUST respond ENTIRELY in ${langName} language. All text including reasoning_summary, reasoning_signals, source titles, and source descriptions MUST be in ${langName}. Do NOT mix languages.
    
You MUST respond using the suggest_difficulty function with the exact schema provided.

Consider:
- Cognitive complexity required
- Prerequisite knowledge needed
- Abstract vs concrete concepts
- Time typically needed to master
- Common student struggles with this topic

IMPORTANT: Always include 2-3 educational resources/sources that support your analysis. These can be:
- Standard textbooks for this subject
- University course materials
- Educational research findings
- Common curriculum standards`;

    const userPrompt = `Analyze the difficulty of this study task:
Title: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ""}
${taskSubject ? `Subject: ${taskSubject}` : ""}

Provide a comprehensive difficulty analysis. Remember to respond ENTIRELY in ${langName} language and include educational resources.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_difficulty",
              description: "Return a comprehensive difficulty analysis for the task",
              parameters: {
                type: "object",
                properties: {
                  difficulty_score: {
                    type: "number",
                    description: "Difficulty score from 0-100",
                  },
                  difficulty_label: {
                    type: "string",
                    enum: ["Easy", "Medium", "Hard", "Expert"],
                    description: "Human-readable difficulty label (keep in English for consistency)",
                  },
                  reasoning_summary: {
                    type: "array",
                    items: { type: "string" },
                    description: `List of 4-6 reasons explaining why this topic has this difficulty level. MUST be in ${langName}.`,
                  },
                  reasoning_signals: {
                    type: "array",
                    items: { type: "string" },
                    description: `Short 2-3 word tags describing reasoning aspects. MUST be in ${langName}.`,
                  },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: `Resource title in ${langName}` },
                        description: { type: "string", description: `Brief description in ${langName}` },
                        type: { type: "string", description: `Type of resource in ${langName} (e.g., Textbook, Course, Research)` },
                        url: { type: "string", description: "URL link to the resource (use real URLs like Amazon book links, MIT OCW, Khan Academy, etc.)" },
                      },
                      required: ["title", "description", "type", "url"],
                    },
                    description: `2-3 educational resources with real URLs that support this analysis. All text MUST be in ${langName}.`,
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level of the analysis from 0-100, based on how well the reasoning and sources support the difficulty assessment",
                  },
                  estimated_time_minutes: {
                    type: "number",
                    description: "Estimated time in minutes to complete this task",
                  },
                },
                required: [
                  "difficulty_score",
                  "difficulty_label",
                  "reasoning_summary",
                  "reasoning_signals",
                  "sources",
                  "confidence",
                  "estimated_time_minutes",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_difficulty" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "suggest_difficulty") {
      throw new Error("Invalid response from AI");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Ensure sources array exists
    if (!analysis.sources || !Array.isArray(analysis.sources)) {
      analysis.sources = [];
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Task difficulty analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
