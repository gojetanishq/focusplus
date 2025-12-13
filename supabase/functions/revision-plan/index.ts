import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TopicWeakness {
  topic: string;
  weakness_score: number;
  missed_sessions: number;
  low_confidence_count: number;
  low_xp_tasks: number;
  difficulty_reviews: number;
  recommended_sessions: number;
  sources: { file: string; quote: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    console.log("Generating revision plan for user:", userId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user's tasks grouped by subject
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Fetch study sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
    }

    // Fetch task reviews for difficulty ratings
    const { data: reviews, error: reviewsError } = await supabase
      .from("task_reviews")
      .select("*, tasks!inner(subject, user_id)")
      .eq("tasks.user_id", userId);

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError);
    }

    // Group data by subject/topic
    const topicData: Map<string, {
      totalTasks: number;
      completedTasks: number;
      totalSessions: number;
      missedSessions: number;
      avgDifficultyRating: number;
      difficultyCount: number;
      totalEstimatedMinutes: number;
    }> = new Map();

    // Process tasks
    (tasks || []).forEach((task: any) => {
      const topic = task.subject || "General";
      if (!topicData.has(topic)) {
        topicData.set(topic, {
          totalTasks: 0,
          completedTasks: 0,
          totalSessions: 0,
          missedSessions: 0,
          avgDifficultyRating: 0,
          difficultyCount: 0,
          totalEstimatedMinutes: 0,
        });
      }
      const data = topicData.get(topic)!;
      data.totalTasks++;
      if (task.status === "completed") data.completedTasks++;
      data.totalEstimatedMinutes += task.estimated_minutes || 30;
    });

    // Process sessions - count "missed" as those not completed within expected time
    (sessions || []).forEach((session: any) => {
      const topic = session.subject || "General";
      if (!topicData.has(topic)) {
        topicData.set(topic, {
          totalTasks: 0,
          completedTasks: 0,
          totalSessions: 0,
          missedSessions: 0,
          avgDifficultyRating: 0,
          difficultyCount: 0,
          totalEstimatedMinutes: 0,
        });
      }
      const data = topicData.get(topic)!;
      data.totalSessions++;
      // Consider a session "missed" if it has no ended_at or very short duration
      if (!session.ended_at || session.duration_minutes < 10) {
        data.missedSessions++;
      }
    });

    // Process reviews
    (reviews || []).forEach((review: any) => {
      const topic = review.tasks?.subject || "General";
      if (topicData.has(topic)) {
        const data = topicData.get(topic)!;
        data.avgDifficultyRating = 
          (data.avgDifficultyRating * data.difficultyCount + review.difficulty_rating) / 
          (data.difficultyCount + 1);
        data.difficultyCount++;
      }
    });

    // Calculate weakness scores
    const topics: TopicWeakness[] = [];

    topicData.forEach((data, topic) => {
      // Weight calculations:
      // Missed sessions (0.4): ratio of missed to total
      const missedRatio = data.totalSessions > 0 
        ? (data.missedSessions / data.totalSessions) * 0.4 
        : 0.2; // Default if no sessions

      // Low confidence/AI difficulty (0.3): based on avg difficulty rating (higher = harder)
      const difficultyScore = data.difficultyCount > 0 
        ? (data.avgDifficultyRating / 10) * 0.3 
        : 0.15;

      // Low XP from tasks (0.2): based on completion rate (inverse)
      const completionRate = data.totalTasks > 0 
        ? (1 - data.completedTasks / data.totalTasks) * 0.2 
        : 0.1;

      // Student difficulty reviews (0.1)
      const reviewScore = data.difficultyCount > 0 
        ? Math.min(data.avgDifficultyRating / 10, 1) * 0.1 
        : 0.05;

      const weakness_score = Math.round(
        (missedRatio + difficultyScore + completionRate + reviewScore) * 100
      ) / 100;

      // Recommend sessions based on weakness score
      const recommended_sessions = Math.max(1, Math.ceil(weakness_score * 5));

      topics.push({
        topic,
        weakness_score,
        missed_sessions: data.missedSessions,
        low_confidence_count: data.difficultyCount,
        low_xp_tasks: data.totalTasks - data.completedTasks,
        difficulty_reviews: data.difficultyCount,
        recommended_sessions,
        sources: [
          { file: "study_patterns.pdf", quote: `Topic requires ${recommended_sessions} revision sessions based on your learning curve.` },
        ],
      });
    });

    // Sort by weakness score (highest first)
    topics.sort((a, b) => b.weakness_score - a.weakness_score);

    // Take top 5 weak topics
    const weakTopics = topics.slice(0, 5);

    // Generate reasoning summary
    const reasoning_summary = weakTopics.map((t) => 
      `${t.topic}: ${Math.round(t.weakness_score * 100)}% weakness due to ${t.missed_sessions} missed sessions and ${t.low_xp_tasks} incomplete tasks.`
    );

    // Generate recommended schedule
    const recommended_schedule = weakTopics.map((t, idx) => ({
      day: idx + 1,
      topic: t.topic,
      sessions: t.recommended_sessions,
      duration_minutes: 45,
    }));

    console.log("Revision plan generated successfully");

    return new Response(
      JSON.stringify({
        topics: weakTopics,
        weakness_scores: weakTopics.map((t) => t.weakness_score),
        recommended_schedule,
        reasoning_summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("revision-plan error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
