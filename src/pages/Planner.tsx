import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Square,
  ChevronDown,
  Lightbulb,
  Brain,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface StudySession {
  id: string;
  subject: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  notes: string | null;
}

interface ScheduleItem {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  duration: number;
  priority: "high" | "medium" | "low";
}

interface ScheduleRationale {
  logs: string[];
  sources: { file: string; chunk: string; relevance: string }[];
}

export default function Planner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [rationale, setRationale] = useState<ScheduleRationale | null>(null);
  const [activeSession, setActiveSession] = useState<{ subject: string; startTime: Date } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timetable-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ userId: user!.id }),
      });

      if (!response.ok) throw new Error("Failed to generate schedule");

      const data = await response.json();
      setSchedule(data.sessions || []);
      setRationale(data.meta || null);
      toast({ title: "Schedule generated!", description: "Your personalized study plan is ready." });
    } catch (error) {
      console.error("Error generating schedule:", error);
      // Generate mock schedule as fallback
      const mockSchedule: ScheduleItem[] = [
        { id: "1", subject: "Mathematics", startTime: "09:00", endTime: "10:30", duration: 90, priority: "high" },
        { id: "2", subject: "Break", startTime: "10:30", endTime: "10:45", duration: 15, priority: "low" },
        { id: "3", subject: "Physics", startTime: "10:45", endTime: "12:00", duration: 75, priority: "medium" },
        { id: "4", subject: "Lunch", startTime: "12:00", endTime: "13:00", duration: 60, priority: "low" },
        { id: "5", subject: "Literature", startTime: "13:00", endTime: "14:30", duration: 90, priority: "medium" },
      ];
      setSchedule(mockSchedule);
      setRationale({
        logs: [
          "Analyzed your task priorities and deadlines",
          "Scheduled high-priority subjects during peak focus hours (morning)",
          "Included regular breaks to maintain concentration",
          "Balanced different subject types throughout the day",
        ],
        sources: [
          { file: "tasks_data", chunk: "pending_tasks", relevance: "high" },
          { file: "study_patterns", chunk: "optimal_hours", relevance: "medium" },
        ],
      });
      toast({ title: "Demo schedule generated", description: "Using sample data for demonstration." });
    } finally {
      setGenerating(false);
    }
  };

  const startSession = (subject: string) => {
    setActiveSession({ subject, startTime: new Date() });
    setElapsedSeconds(0);
    toast({ title: `Started studying ${subject}` });
  };

  const endSession = async () => {
    if (!activeSession) return;

    const duration = Math.max(1, Math.floor(elapsedSeconds / 60));
    
    try {
      const { error } = await supabase.from("study_sessions").insert({
        user_id: user!.id,
        subject: activeSession.subject,
        started_at: activeSession.startTime.toISOString(),
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
      });

      if (error) throw error;

      toast({
        title: "Session completed!",
        description: `You studied ${activeSession.subject} for ${duration} minutes.`,
      });
      fetchSessions();
    } catch (error) {
      console.error("Error saving session:", error);
    } finally {
      setActiveSession(null);
      setElapsedSeconds(0);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted";
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Study Planner</h1>
            <p className="mt-1 text-muted-foreground">AI-powered scheduling with transparent reasoning</p>
          </div>
          <Button onClick={generateSchedule} disabled={generating} className="focus-gradient gap-2">
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Schedule
          </Button>
        </div>

        {/* Active Session Timer */}
        {activeSession && (
          <Card className="mb-8 border-primary bg-primary/5">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3 animate-pulse">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Studying: {activeSession.subject}</h3>
                  <p className="text-4xl font-bold font-mono text-primary">{formatTime(elapsedSeconds)}</p>
                </div>
              </div>
              <Button onClick={endSession} variant="destructive" size="lg" className="gap-2">
                <Square className="h-4 w-4" />
                End Session
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Schedule
              </CardTitle>
              <CardDescription>
                {schedule.length > 0
                  ? "Your AI-generated study plan"
                  : "Generate a personalized schedule based on your tasks"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedule.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-4">No schedule generated yet</p>
                  <Button onClick={generateSchedule} disabled={generating} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedule.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-sm font-medium">{item.startTime}</p>
                          <p className="text-xs text-muted-foreground">to {item.endTime}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.subject}</h4>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.duration} min</p>
                        </div>
                      </div>
                      {item.priority !== "low" && !activeSession && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startSession(item.subject)}
                          className="gap-1"
                        >
                          <Play className="h-4 w-4" />
                          Start
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Why This Schedule Panel */}
              {rationale && (
                <Collapsible className="mt-6">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-warning" />
                        Why this schedule?
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <h4 className="font-medium mb-2">Scheduling Rationale:</h4>
                      <ul className="space-y-2">
                        {rationale.logs.map((log, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            {log}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {rationale.sources.length > 0 && (
                      <div className="rounded-lg border border-info/30 bg-info/5 p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Brain className="h-4 w-4 text-info" />
                          Data Sources:
                        </h4>
                        <div className="space-y-2">
                          {rationale.sources.map((source, i) => (
                            <div key={i} className="text-sm">
                              <Badge variant="outline" className="mr-2">{source.file}</Badge>
                              <span className="text-muted-foreground">
                                chunk: {source.chunk} (relevance: {source.relevance})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Sessions
              </CardTitle>
              <CardDescription>Your study history</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No study sessions yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start a session from your schedule above
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <h4 className="font-medium">{session.subject || "General Study"}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.started_at).toLocaleDateString()} •{" "}
                          {session.duration_minutes} min
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{session.duration_minutes}</p>
                        <p className="text-xs text-muted-foreground">minutes</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
