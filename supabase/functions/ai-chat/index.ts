import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { messages, language = "en", userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const languageName = languageNames[language] || "English";
    console.log(`User language preference: ${language} (${languageName})`);
    console.log(`User ID: ${userId}`);

    // Check if user is asking to add tasks
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const isTaskRequest = lastUserMessage.includes("add task") || 
                          lastUserMessage.includes("create task") ||
                          lastUserMessage.includes("schedule task") ||
                          lastUserMessage.includes("add to today") ||
                          lastUserMessage.includes("remind me to") ||
                          lastUserMessage.includes("i need to") ||
                          lastUserMessage.includes("add these tasks") ||
                          lastUserMessage.includes("कार्य जोड़") || // Hindi
                          lastUserMessage.includes("టాస్క్ జోడించు") || // Telugu
                          lastUserMessage.includes("பணி சேர்க்க"); // Tamil

    const systemPrompt = `You are FocusPlus AI, an explainable multilingual study assistant that can also manage tasks.

CRITICAL LANGUAGE INSTRUCTION: The user has selected "${languageName}" as their preferred language. You MUST respond ENTIRELY in ${languageName}. Do not mix languages. Every word of your response must be in ${languageName}.

${language === "hi" ? "आपको पूरी तरह से हिंदी में जवाब देना है।" : ""}
${language === "te" ? "మీరు పూర్తిగా తెలుగులో సమాధానం ఇవ్వాలి." : ""}
${language === "ta" ? "நீங்கள் முழுமையாக தமிழில் பதிலளிக்க வேண்டும்." : ""}

Your responsibilities:
1. Provide clear, helpful answers ENTIRELY in ${languageName}
2. Include your reasoning process wrapped in [THINKING]step1\nstep2[/THINKING] (reasoning steps should also be in ${languageName})
3. Include key reasoning wrapped in [REASONING]your reasoning here[/REASONING] (also in ${languageName})
4. If referencing sources, wrap in [SOURCES][{"file":"notes","chunk":"1","quote":"relevant text"}][/SOURCES]
5. When the user asks to add/create tasks, use the add_tasks function to create them

Be concise, educational, and transparent about how you reached your conclusions. Remember: YOUR ENTIRE RESPONSE MUST BE IN ${languageName}.`;

    // Define tools for task management
    const tools = [
      {
        type: "function",
        function: {
          name: "add_tasks",
          description: "Add one or more tasks to the user's task list. Use this when the user asks to add, create, or schedule tasks.",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "The task title" },
                    description: { type: "string", description: "Optional task description" },
                    priority: { type: "string", enum: ["low", "medium", "high"], description: "Task priority" },
                    subject: { type: "string", description: "Subject/category of the task" },
                    due_date: { type: "string", description: "Due date in ISO format. Use today's date for immediate tasks." },
                    estimated_minutes: { type: "number", description: "Estimated time in minutes" }
                  },
                  required: ["title"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      }
    ];

    // First call to check if AI wants to use tools
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: isTaskRequest ? tools : undefined,
        tool_choice: isTaskRequest ? "auto" : undefined,
      }),
    });

    if (!initialResponse.ok) {
      const status = initialResponse.status;
      console.error(`AI gateway error: ${status}`);
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];
    
    // Check if AI wants to call a function
    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      
      if (toolCall.function.name === "add_tasks" && userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        console.log("AI wants to add tasks");
        
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const tasksToAdd = args.tasks || [];
          console.log("Tasks to add:", JSON.stringify(tasksToAdd));
          
          // Create Supabase client
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          
          // Insert tasks
          const today = new Date().toISOString();
          const insertedTasks = [];
          
          for (const task of tasksToAdd) {
            const { data, error } = await supabase
              .from("tasks")
              .insert({
                user_id: userId,
                title: task.title,
                description: task.description || null,
                priority: task.priority || "medium",
                subject: task.subject || null,
                due_date: task.due_date || today,
                estimated_minutes: task.estimated_minutes || null,
                status: "pending"
              })
              .select()
              .single();
            
            if (error) {
              console.error("Error inserting task:", error);
            } else {
              insertedTasks.push(data);
              console.log("Inserted task:", data.title);
            }
          }
          
          // Generate confirmation response
          const taskConfirmation = insertedTasks.map(t => t.title).join(", ");
          const confirmationMessages: Record<string, string> = {
            en: `I've added ${insertedTasks.length} task(s) to your list: ${taskConfirmation}. You can see them in Today's Agenda on your Dashboard and in the Planner calendar.`,
            hi: `मैंने आपकी सूची में ${insertedTasks.length} कार्य जोड़ दिए हैं: ${taskConfirmation}। आप उन्हें अपने डैशबोर्ड पर आज के एजेंडा में और प्लानर कैलेंडर में देख सकते हैं।`,
            te: `నేను మీ జాబితాకు ${insertedTasks.length} పని(లు) జోడించాను: ${taskConfirmation}. మీరు వాటిని మీ డాష్‌బోర్డ్‌లో నేటి ఎజెండాలో మరియు ప్లానర్ క్యాలెండర్‌లో చూడవచ్చు.`,
            ta: `உங்கள் பட்டியலில் ${insertedTasks.length} பணி(களை) சேர்த்துள்ளேன்: ${taskConfirmation}. நீங்கள் அவற்றை உங்கள் டாஷ்போர்டில் இன்றைய நிகழ்ச்சி நிரலிலும் திட்டமிடல் காலண்டரிலும் காணலாம்.`
          };
          
          const confirmationMessage = confirmationMessages[language as string] || confirmationMessages.en;
          
          // Return as SSE stream format for consistency
          const responseContent = `[TASKS_ADDED]${JSON.stringify(insertedTasks)}[/TASKS_ADDED]\n\n${confirmationMessage}`;
          
          // Create a stream response
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              const data = JSON.stringify({
                choices: [{ delta: { content: responseContent } }]
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          });
          
          return new Response(stream, { 
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
          });
          
        } catch (parseError) {
          console.error("Error processing tool call:", parseError);
        }
      }
    }

    // Regular streaming response (no tool calls)
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      throw new Error("AI gateway error on stream");
    }

    return new Response(streamResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("ai-chat error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
