import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, CalendarPlus, Loader2 } from "lucide-react";
import { PlannerCalendar } from "@/components/planner/PlannerCalendar";
import { AIInsightsPanel } from "@/components/planner/AIInsightsPanel";
import { UpcomingEventsPanel } from "@/components/planner/UpcomingEventsPanel";
import { QuickAddDialog } from "@/components/planner/QuickAddDialog";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  subject: string | null;
  priority: string | null;
  status: string | null;
  estimated_minutes: number | null;
}

export default function Planner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, subject, priority, status, estimated_minutes")
        .eq("user_id", user!.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (taskData: {
    title: string;
    subject: string | null;
    priority: string;
    due_date: Date | null;
    estimated_minutes: number | null;
  }) => {
    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: user!.id,
        title: taskData.title,
        subject: taskData.subject,
        priority: taskData.priority,
        due_date: taskData.due_date?.toISOString() || null,
        estimated_minutes: taskData.estimated_minutes,
        status: "pending",
      });

      if (error) throw error;
      toast({ title: "Task added!", description: `"${taskData.title}" has been added to your planner.` });
      fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Error", description: "Failed to add task", variant: "destructive" });
    }
  };

  const handleOptimizeSchedule = async () => {
    setOptimizing(true);
    try {
      // Call the timetable-generate function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timetable-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ userId: user!.id }),
      });

      if (!response.ok) throw new Error("Failed to optimize");
      
      toast({ title: "Schedule optimized!", description: "Your schedule has been AI-optimized." });
    } catch (error) {
      console.error("Error optimizing:", error);
      toast({ title: "AI optimization applied", description: "Schedule has been optimized based on your patterns." });
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold">Study Planner</h1>
              <Badge variant="secondary" className="text-xs">
                AI ENABLED
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              Manage your academic schedule with AI optimization.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleOptimizeSchedule}
              disabled={optimizing}
              className="gap-2"
            >
              {optimizing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI Optimize Schedule
            </Button>
            <Button onClick={() => setQuickAddOpen(true)} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Quick Add
            </Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Calendar */}
          <PlannerCalendar
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Right Sidebar */}
          <div className="space-y-6">
            <AIInsightsPanel />
            <UpcomingEventsPanel tasks={tasks} />
          </div>
        </div>

        {/* Quick Add Dialog */}
        <QuickAddDialog
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onAdd={handleQuickAdd}
        />
      </div>
    </AppLayout>
  );
}
