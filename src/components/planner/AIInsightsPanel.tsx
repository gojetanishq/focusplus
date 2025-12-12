import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Lightbulb, TrendingUp } from "lucide-react";

interface AIInsightsPanelProps {
  onViewAnalysis?: () => void;
}

export function AIInsightsPanel({ onViewAnalysis }: AIInsightsPanelProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-success text-sm">Suggestion: </span>
              <span className="text-sm text-muted-foreground">
                You have a heavy load on Tuesday. Consider moving "Physics Lab" prep to Monday?
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-warning text-sm">Stats: </span>
              <span className="text-sm text-muted-foreground">
                You are most productive between 10 AM - 2 PM based on your streak history.
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-primary hover:text-primary"
          onClick={onViewAnalysis}
        >
          View Full Analysis
        </Button>
      </CardContent>
    </Card>
  );
}
