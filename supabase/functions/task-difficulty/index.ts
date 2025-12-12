import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskTitle, taskDescription, taskSubject } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an educational difficulty analyzer. Given a task or topic, analyze its difficulty level for students. 
    
You MUST respond using the suggest_difficulty function with the exact schema provided.

Consider:
- Cognitive complexity required
- Prerequisite knowledge needed
- Abstract vs concrete concepts
- Time typically needed to master
- Common student struggles with this topic`;

    const userPrompt = `Analyze the difficulty of this study task:
Title: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ""}
${taskSubject ? `Subject: ${taskSubject}` : ""}

Provide a comprehensive difficulty analysis.`;

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
                    description: "Human-readable difficulty label",
                  },
                  reasoning_summary: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of 4-6 reasons explaining why this topic has this difficulty level",
                  },
                  reasoning_signals: {
                    type: "array",
                    items: { type: "string" },
                    description: "Short 2-3 word tags describing reasoning aspects (e.g., 'multi step', 'high depth')",
                  },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        type: { type: "string" },
                      },
                      required: ["title", "description", "type"],
                    },
                    description: "Educational resources that informed this analysis",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level of the analysis from 0-100",
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
