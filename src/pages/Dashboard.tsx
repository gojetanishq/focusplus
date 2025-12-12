import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Target,
  TrendingUp,
  Flame,
} from "lucide-react";

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  totalNotes: number;
  totalStudyMinutes: number;
  todaySessions: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    totalNotes: 0,
    totalStudyMinutes: 0,
    todaySessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const [tasksRes, notesRes, sessionsRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("user_id", user!.id),
        supabase.from("notes").select("id").eq("user_id", user!.id),
        supabase.from("study_sessions").select("*").eq("user_id", user!.id),
      ]);

      const tasks = tasksRes.data || [];
      const notes = notesRes.data || [];
      const sessions = sessionsRes.data || [];

      const today = new Date().toISOString().split("T")[0];
      const todaySessions = sessions.filter((s) => s.started_at.startsWith(today));

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        totalNotes: notes.length,
        totalStudyMinutes: sessions.reduce((acc, s) => acc + s.duration_minutes, 0),
        todaySessions: todaySessions.length,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const taskProgress = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const studyHours = Math.floor(stats.totalStudyMinutes / 60);
  const studyMins = stats.totalStudyMinutes % 60;

  const quickActions = [
    { label: "Add Task", icon: Plus, to: "/tasks", color: "bg-primary" },
    { label: "Upload Notes", icon: FileText, to: "/notes", color: "bg-accent" },
    { label: "Start Session", icon: Clock, to: "/planner", color: "bg-success" },
    { label: "AI Chat", icon: MessageSquare, to: "/chat", color: "bg-info" },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome back,{" "}
            <span className="focus-gradient-text">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student"}
            </span>
          </h1>
          <p className="mt-1 text-muted-foreground">Here's your study overview for today</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to}>
              <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-lg ${action.color} p-2.5`}>
                    <action.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {action.label}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Task Progress</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.completedTasks}/{stats.totalTasks}
              </div>
              <Progress value={taskProgress} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {taskProgress.toFixed(0)}% completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studyHours}h {studyMins}m
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Total time focused</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNotes}</div>
              <p className="mt-2 text-xs text-muted-foreground">Documents uploaded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Sessions</CardTitle>
              <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySessions}</div>
              <p className="mt-2 text-xs text-muted-foreground">Focus sessions today</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Upcoming Tasks
                  </CardTitle>
                  <CardDescription>Your priority tasks for today</CardDescription>
                </div>
                <Link to="/tasks">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.totalTasks === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckSquare className="mb-2 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No tasks yet</p>
                  <Link to="/tasks">
                    <Button variant="link" className="mt-2">Create your first task</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="font-medium">View your tasks</p>
                    <p className="text-sm text-muted-foreground">
                      You have {stats.totalTasks - stats.completedTasks} pending tasks
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Study Insights
                  </CardTitle>
                  <CardDescription>AI-powered analysis of your progress</CardDescription>
                </div>
                <Link to="/chat">
                  <Button variant="outline" size="sm">Ask AI</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm">
                  <span className="font-medium text-primary">💡 Tip:</span> Use the AI Assistant to get
                  personalized study recommendations based on your notes and progress.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <Calendar className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="font-semibold">{stats.todaySessions} sessions</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <Flame className="mx-auto mb-1 h-5 w-5 text-warning" />
                  <p className="text-xs text-muted-foreground">Streak</p>
                  <p className="font-semibold">Keep going!</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
