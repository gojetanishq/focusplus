import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Brain, 
  BookOpen, 
  ExternalLink,
  Loader2,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface DifficultyAnalysis {
  difficulty_score: number;
  difficulty_label: string;
  reasoning_summary: string[];
  reasoning_signals: string[];
  sources: Array<{ title: string; description: string; type: string }>;
  confidence: number;
  estimated_time_minutes: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  status: string | null;
  priority: string | null;
}

interface AgendaTaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
}

export function AgendaTaskCard({ task, onComplete }: AgendaTaskCardProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<DifficultyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDifficultyAnalysis = async () => {
    if (analysis) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("task-difficulty", {
        body: {
          taskTitle: task.title,
          taskDescription: task.description,
          taskSubject: task.subject,
        },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);
      
      setAnalysis(data);
    } catch (err) {
      console.error("Error fetching difficulty:", err);
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen && !analysis) {
      fetchDifficultyAnalysis();
    }
    setIsOpen(!isOpen);
  };

  const getDifficultyColor = (label: string) => {
    switch (label) {
      case "Easy": return "bg-success text-success-foreground";
      case "Medium": return "bg-warning text-warning-foreground";
      case "Hard": return "bg-destructive text-destructive-foreground";
      case "Expert": return "bg-primary text-primary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getProgressColor = (score: number) => {
    if (score < 30) return "bg-success";
    if (score < 60) return "bg-warning";
    if (score < 80) return "bg-destructive";
    return "bg-primary";
  };

  const formatTime = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "h:mm a");
  };

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold truncate">{task.title}</h3>
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={() => onComplete(task.id)}
                  className="h-5 w-5"
                />
              </div>
              
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(task.due_date)}
                  </span>
                )}
                {task.estimated_minutes && (
                  <span>({task.estimated_minutes}m)</span>
                )}
                
                <Collapsible open={isOpen} onOpenChange={handleToggle}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 gap-1 px-2 text-xs ${
                        analysis ? getDifficultyColor(analysis.difficulty_label) : "bg-muted"
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : analysis ? (
                        <>
                          {analysis.difficulty_label}
                          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          {t("difficulty.analyze")}
                          <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            </div>
          </div>
        </div>

        <Collapsible open={isOpen}>
          <CollapsibleContent>
            {loading && (
              <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t("difficulty.analyzing")}</span>
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-destructive">
                <p>{error}</p>
                <Button variant="link" onClick={fetchDifficultyAnalysis} className="mt-2">
                  {t("difficulty.tryAgain")}
                </Button>
              </div>
            )}

            {analysis && !loading && (
              <div className="border-t border-border/50 p-4 space-y-4">
                {/* Difficulty Score */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t("difficulty.score")}</span>
                    <span className="font-semibold">{analysis.difficulty_score}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full transition-all ${getProgressColor(analysis.difficulty_score)}`}
                      style={{ width: `${analysis.difficulty_score}%` }}
                    />
                  </div>
                </div>

                {/* Why Hard Section */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="flex items-center gap-2 font-medium mb-3">
                    <Brain className="h-4 w-4 text-primary" />
                    {t("difficulty.why")} {analysis.difficulty_label}?
                  </h4>
                  <ul className="space-y-2">
                    {analysis.reasoning_summary.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reasoning Signals */}
                <div>
                  <h4 className="flex items-center gap-2 font-medium mb-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t("difficulty.reasoningSignals")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.reasoning_signals.map((signal, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Resources Used */}
                <div>
                  <h4 className="flex items-center gap-2 font-medium mb-2 text-sm">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {t("difficulty.resourcesUsed")}
                  </h4>
                  <div className="space-y-2">
                    {analysis.sources.map((source, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{source.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{source.description}"
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {source.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confidence & Time */}
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border/50">
                  <span>{t("difficulty.confidence")}: {analysis.confidence}%</span>
                  <span>{t("difficulty.estTime")}: {analysis.estimated_time_minutes}m</span>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
