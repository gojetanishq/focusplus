import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch user's tasks and study sessions
    const [tasksResult, sessionsResult, profileResult] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId),
      supabase.from("study_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("daily_focus_hours, study_goal").eq("user_id", userId).single(),
    ]);

    const tasks = tasksResult.data || [];
    const studySessions = sessionsResult.data || [];
    const profile = profileResult.data;

    const pendingTasks = tasks.filter(t => t.status === "pending");
    const completedTasks = tasks.filter(t => t.status === "completed");

    // Calculate study patterns
    const sessionsByHour: Record<number, number> = {};
    studySessions.forEach(s => {
      const hour = new Date(s.started_at).getHours();
      sessionsByHour[hour] = (sessionsByHour[hour] || 0) + s.duration_minutes;
    });

    const peakHours = Object.entries(sessionsByHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Get subjects distribution
    const subjectMinutes: Record<string, number> = {};
    studySessions.forEach(s => {
      const subject = s.subject || "General";
      subjectMinutes[subject] = (subjectMinutes[subject] || 0) + s.duration_minutes;
    });

    // Build AI prompt with user data
    const systemPrompt = `You are an AI study schedule optimizer. Analyze the student's data and provide personalized schedule optimization suggestions. Be specific and actionable. Always explain your reasoning.`;

    const userPrompt = `Analyze this student's study data and provide optimization insights:

PENDING TASKS (${pendingTasks.length}):
${pendingTasks.map(t => `- ${t.title} | Subject: ${t.subject || "Not specified"} | Priority: ${t.priority} | Due: ${t.due_date || "No deadline"}`).join("\n") || "No pending tasks"}

COMPLETED TASKS (${completedTasks.length}):
${completedTasks.slice(0, 5).map(t => `- ${t.title} | Subject: ${t.subject || "Not specified"}`).join("\n") || "No completed tasks"}

RECENT STUDY SESSIONS:
${studySessions.slice(0, 5).map(s => `- ${s.subject || "Study"} | ${s.duration_minutes} mins | ${new Date(s.started_at).toLocaleDateString()}`).join("\n") || "No sessions recorded"}

STUDY PATTERNS:
- Peak productivity hours: ${peakHours.length > 0 ? peakHours.map(h => `${h}:00`).join(", ") : "Not enough data"}
- Daily focus goal: ${profile?.daily_focus_hours || 4} hours
- Study goal: ${profile?.study_goal || "Not set"}

Provide optimization analysis.`;

    console.log("Calling Lovable AI for schedule optimization...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "optimize_schedule",
              description: "Provide schedule optimization with explainable insights",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["suggestion", "warning", "stat", "tip"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        reasoning: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["type", "title", "description", "reasoning"],
                    },
                  },
                  recommended_sessions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        suggested_time: { type: "string" },
                        duration_minutes: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["subject", "suggested_time", "duration_minutes", "reason"],
                    },
                  },
                  peak_hours: {
                    type: "array",
                    items: { type: "string" },
                  },
                  workload_balance: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["balanced", "heavy", "light"] },
                      message: { type: "string" },
                    },
                  },
                  overall_recommendation: { type: "string" },
                },
                required: ["insights", "recommended_sessions", "overall_recommendation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "optimize_schedule" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received:", JSON.stringify(aiData).slice(0, 500));

    let optimization;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        optimization = JSON.parse(toolCall.function.arguments);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }

    // Fallback if AI parsing fails
    if (!optimization) {
      optimization = {
        insights: [
          {
            type: "suggestion",
            title: "Start with High Priority Tasks",
            description: "Focus on your high-priority pending tasks first thing in the morning.",
            reasoning: `You have ${pendingTasks.filter(t => t.priority === "high").length} high-priority tasks pending.`,
            priority: "high",
          },
          {
            type: "stat",
            title: "Your Peak Hours",
            description: peakHours.length > 0 
              ? `You're most productive around ${peakHours.map(h => `${h}:00`).join(", ")}.`
              : "Track more study sessions to discover your peak hours.",
            reasoning: "Based on your historical study session data.",
            priority: "medium",
          },
        ],
        recommended_sessions: pendingTasks.slice(0, 3).map((t, i) => ({
          subject: t.subject || t.title,
          suggested_time: `${9 + i * 2}:00 AM`,
          duration_minutes: 60,
          reason: `Priority: ${t.priority}`,
        })),
        overall_recommendation: "Complete high-priority tasks during your peak productivity hours for best results.",
      };
    }

    // Add source attribution for explainability
    const sources = [
      { type: "tasks", count: tasks.length, description: "Your task data" },
      { type: "sessions", count: studySessions.length, description: "Recent study sessions" },
      { type: "patterns", description: "Your study patterns and habits" },
    ];

    return new Response(JSON.stringify({
      optimization,
      sources,
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("timetable-generate error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
