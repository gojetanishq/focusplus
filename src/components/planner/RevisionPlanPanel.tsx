import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Brain, Loader2, Plus, AlertTriangle, BookOpen } from "lucide-react";

interface TopicWeakness {
  topic: string;
  weakness_score: number;
  missed_sessions: number;
  low_xp_tasks: number;
  recommended_sessions: number;
  sources: { file: string; quote: string }[];
}

interface RevisionPlanPanelProps {
  onAddToTimetable?: (topic: string, sessions: number) => void;
}

export function RevisionPlanPanel({ onAddToTimetable }: RevisionPlanPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{
    topics: TopicWeakness[];
    reasoning_summary: string[];
  } | null>(null);

  const generatePlan = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revision-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate plan");

      const data = await response.json();
      setPlan(data);
      toast({
        title: "Revision Plan Generated",
        description: `Found ${data.topics.length} topics needing revision.`,
      });
    } catch (error) {
      console.error("Error generating revision plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate revision plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeaknessColor = (score: number) => {
    if (score >= 0.7) return "text-destructive";
    if (score >= 0.4) return "text-warning";
    return "text-muted-foreground";
  };

  const getWeaknessBadge = (score: number) => {
    if (score >= 0.7) return { label: "HIGH", variant: "destructive" as const };
    if (score >= 0.4) return { label: "MEDIUM", variant: "secondary" as const };
    return { label: "LOW", variant: "outline" as const };
  };

  return (
    <Card className="border-warning/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5 text-warning" />
          Smart Revision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!plan ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Analyze your study patterns to find weak topics that need revision.
            </p>
            <Button
              onClick={generatePlan}
              disabled={loading}
              className="gap-2"
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Generate Revision Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {plan.topics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Great job! No weak topics found.
              </p>
            ) : (
              plan.topics.map((topic, idx) => {
                const badge = getWeaknessBadge(topic.weakness_score);
                return (
                  <div
                    key={topic.topic}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`h-4 w-4 ${getWeaknessColor(topic.weakness_score)}`}
                        />
                        <span className="font-medium text-sm">{topic.topic}</span>
                      </div>
                      <Badge variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <span className={getWeaknessColor(topic.weakness_score)}>
                        {Math.round(topic.weakness_score * 100)}% weakness
                      </span>
                      <span className="mx-1">•</span>
                      <span>{topic.missed_sessions} missed</span>
                      <span className="mx-1">•</span>
                      <span>{topic.low_xp_tasks} incomplete</span>
                    </div>

                    {topic.sources[0] && (
                      <div className="flex items-start gap-1.5 text-xs bg-muted/50 rounded p-2">
                        <BookOpen className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                        <span className="text-muted-foreground italic">
                          "{topic.sources[0].quote}"
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        Suggested: {topic.recommended_sessions} sessions
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() =>
                          onAddToTimetable?.(topic.topic, topic.recommended_sessions)
                        }
                      >
                        <Plus className="h-3 w-3" />
                        Add to Timetable
                      </Button>
                    </div>
                  </div>
                );
              })
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setPlan(null)}
            >
              Refresh Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
