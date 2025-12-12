import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Clock,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Brain,
  Loader2,
  Sparkles,
  RefreshCw,
  BookOpen,
  ExternalLink,
  Star,
  CheckCircle,
  TrendingUp,
  Send,
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
  difficulty: "easy" | "medium" | "hard";
  difficultyScore?: number;
  reasoning?: string[];
  reasoningSignals?: string[];
  resources?: { title: string; quote: string; type: string; url?: string }[];
  confidence?: number;
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [ratingItem, setRatingItem] = useState<ScheduleItem | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");

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
      // Generate enhanced mock schedule
      const mockSchedule: ScheduleItem[] = [
        { 
          id: "1", 
          subject: "Advanced Calculus II", 
          startTime: "10:00 AM", 
          endTime: "11:30 AM", 
          duration: 90, 
          difficulty: "hard",
          difficultyScore: 85,
          reasoning: [
            "Requires multi-step symbolic logical reasoning with abstract mathematical concepts",
            "High context depth - relies heavily on prerequisite knowledge from Calculus I",
            "Cross-domain connections required (algebra, geometry, and analysis)",
            "Precision correctness is critical - small errors compound significantly",
            "Involves complex problem-solving with multiple solution paths"
          ],
          reasoningSignals: ["multi step", "high depth", "abstract reasoning", "symbolic manipulation"],
          resources: [
            { title: "MIT OpenCourseWare: Multivariable Calculus", quote: "Integration in high dimensions requires visualizing vector fields and understanding geometric interpretations.", type: "ocw", url: "https://ocw.mit.edu" },
            { title: "Thomas' Calculus: Early Transcendentals", quote: "Advanced techniques require mastery of fundamental principles and their applications.", type: "textbook" }
          ],
          confidence: 92
        },
        { 
          id: "2", 
          subject: "React Physics Engine", 
          startTime: "2:00 PM", 
          endTime: "2:45 PM", 
          duration: 45, 
          difficulty: "medium",
          difficultyScore: 58,
          reasoning: [
            "Combines programming logic with physics concepts",
            "Moderate complexity in implementation patterns"
          ],
          reasoningSignals: ["applied math", "coding patterns"],
          confidence: 85
        },
        { 
          id: "3", 
          subject: "Japanese Kanji Review", 
          startTime: "4:30 PM", 
          endTime: "5:00 PM", 
          duration: 30, 
          difficulty: "easy",
          difficultyScore: 32,
          reasoning: [
            "Pattern recognition and memorization based",
            "Builds on previously learned characters"
          ],
          reasoningSignals: ["memorization", "pattern matching"],
          confidence: 95
        },
      ];
      setSchedule(mockSchedule);
      setRationale({
        logs: [
          "Analyzed your task priorities and deadlines",
          "Scheduled high-difficulty subjects during peak focus hours (morning)",
          "Included variety to maintain engagement",
          "Balanced cognitive load throughout the day",
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
    const subject = activeSession.subject;
    
    try {
      const { error } = await supabase.from("study_sessions").insert({
        user_id: user!.id,
        subject: activeSession.subject,
        started_at: activeSession.startTime.toISOString(),
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
      });

      if (error) throw error;

      setActiveSession(null);
      setElapsedSeconds(0);
      
      // Show rating dialog
      const item = schedule.find(s => s.subject === subject);
      if (item) {
        setRatingItem(item);
        setRatingValue(5);
        setRatingComment("");
      }
      
      fetchSessions();
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const submitRating = () => {
    toast({
      title: "Rating submitted!",
      description: `You rated ${ratingItem?.subject} as ${getDifficultyLabel(ratingValue)}`,
    });
    setRatingItem(null);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "hard": return "bg-destructive/90 text-destructive-foreground hover:bg-destructive";
      case "medium": return "bg-warning/90 text-warning-foreground hover:bg-warning";
      case "easy": return "bg-success/90 text-success-foreground hover:bg-success";
      default: return "bg-muted";
    }
  };

  const getDifficultyLabel = (value: number) => {
    if (value <= 3) return "Easy";
    if (value <= 6) return "Medium";
    return "Hard";
  };

  const getDifficultyLabelColor = (value: number) => {
    if (value <= 3) return "bg-success text-success-foreground";
    if (value <= 6) return "bg-warning text-warning-foreground";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Study Planner</h1>
            <p className="mt-1 text-muted-foreground">AI-powered scheduling with difficulty analysis</p>
          </div>
          <Button onClick={generateSchedule} disabled={generating} className="focus-gradient gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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
                {schedule.length > 0 ? "Your AI-generated study plan with difficulty analysis" : "Generate a personalized schedule"}
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
                    <div key={item.id} className="rounded-xl border bg-card overflow-hidden">
                      {/* Schedule Item Header */}
                      <div 
                        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.subject}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {item.startTime} ({item.duration}m)
                          </div>
                        </div>
                        <Badge className={getDifficultyColor(item.difficulty)}>
                          {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                          {expandedItem === item.id ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                        </Badge>
                        {!activeSession && (
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); startSession(item.subject); }}>
                            <CheckCircle className="h-5 w-5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>

                      {/* Expanded Difficulty Analysis */}
                      {expandedItem === item.id && item.difficultyScore && (
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          {/* Difficulty Score */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Difficulty Score</span>
                            <span className="font-bold text-lg">{item.difficultyScore}/100</span>
                          </div>
                          <Progress value={item.difficultyScore} className="h-2" />

                          {/* Why Hard Section */}
                          {item.reasoning && item.reasoning.length > 0 && (
                            <div className="rounded-lg bg-background p-4">
                              <h5 className="font-medium mb-2 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Why {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}?
                              </h5>
                              <ul className="space-y-1.5">
                                {item.reasoning.map((reason, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="text-primary mt-0.5">•</span>
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Reasoning Signals */}
                          {item.reasoningSignals && item.reasoningSignals.length > 0 && (
                            <div>
                              <h5 className="font-medium mb-2 flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4" />
                                Reasoning Signals
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {item.reasoningSignals.map((signal) => (
                                  <Badge key={signal} variant="outline" className="text-xs">{signal}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resources */}
                          {item.resources && item.resources.length > 0 && (
                            <div>
                              <h5 className="font-medium mb-2 flex items-center gap-2 text-sm">
                                <BookOpen className="h-4 w-4" />
                                Resources Used
                              </h5>
                              <div className="space-y-2">
                                {item.resources.map((resource, i) => (
                                  <div key={i} className="rounded-lg border bg-background p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <h6 className="font-medium text-sm">{resource.title}</h6>
                                      {resource.url && (
                                        <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                        </a>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">"{resource.quote}"</p>
                                    <Badge variant="secondary" className="mt-2 text-[10px]">{resource.type}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Confidence */}
                          {item.confidence && (
                            <div className="text-sm text-muted-foreground">
                              Confidence: {item.confidence}%
                            </div>
                          )}
                        </div>
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
                      <ul className="space-y-2">
                        {rationale.logs.map((log, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            {log}
                          </li>
                        ))}
                      </ul>
                    </div>
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
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <h4 className="font-medium">{session.subject || "General Study"}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.started_at).toLocaleDateString()} • {session.duration_minutes} min
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

      {/* Rating Dialog */}
      <Dialog open={!!ratingItem} onOpenChange={() => setRatingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground">Course/Session:</p>
              <p className="font-semibold">{ratingItem?.subject}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Difficulty Rating (1-10)</p>
              <div className="flex items-center gap-2 py-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${star <= ratingValue ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  value={[ratingValue]}
                  onValueChange={([v]) => setRatingValue(v)}
                  max={10}
                  min={1}
                  step={1}
                  className="flex-1"
                />
                <div className="flex items-center gap-2 min-w-[80px]">
                  <span className="text-2xl font-bold text-primary">{ratingValue}</span>
                  <span className="text-muted-foreground">/10</span>
                </div>
              </div>
              <Badge className={getDifficultyLabelColor(ratingValue)}>
                {getDifficultyLabel(ratingValue)}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Additional Comments (Optional)</p>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your thoughts about the difficulty, what helped you, or any tips for others..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRatingItem(null)}>Skip</Button>
              <Button onClick={submitRating} className="focus-gradient gap-2">
                <Send className="h-4 w-4" />
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
