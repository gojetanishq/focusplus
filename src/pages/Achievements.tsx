import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Flame, Target, Clock, BookOpen, Brain, Lock } from "lucide-react";

const achievements = [
  {
    id: 1,
    title: "First Steps",
    description: "Complete your first study session",
    icon: Star,
    unlocked: true,
    progress: 100,
  },
  {
    id: 2,
    title: "Week Warrior",
    description: "Study 7 days in a row",
    icon: Flame,
    unlocked: false,
    progress: 42,
    current: 3,
    target: 7,
  },
  {
    id: 3,
    title: "Task Master",
    description: "Complete 10 tasks",
    icon: Target,
    unlocked: false,
    progress: 60,
    current: 6,
    target: 10,
  },
  {
    id: 4,
    title: "Night Owl",
    description: "Study for 2 hours after 10 PM",
    icon: Clock,
    unlocked: false,
    progress: 0,
  },
  {
    id: 5,
    title: "Bookworm",
    description: "Upload 20 notes",
    icon: BookOpen,
    unlocked: false,
    progress: 25,
    current: 5,
    target: 20,
  },
  {
    id: 6,
    title: "AI Explorer",
    description: "Ask the AI assistant 50 questions",
    icon: Brain,
    unlocked: false,
    progress: 10,
    current: 5,
    target: 50,
  },
];

const stats = [
  { label: "Total XP", value: "1,250", icon: Star },
  { label: "Current Streak", value: "3 days", icon: Flame },
  { label: "Achievements", value: "1/6", icon: Trophy },
];

export default function Achievements() {
  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-warning" />
            Achievements
          </h1>
          <p className="mt-1 text-muted-foreground">Track your progress and unlock rewards</p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <Card
              key={achievement.id}
              className={`transition-all ${
                achievement.unlocked
                  ? "border-warning/50 bg-warning/5"
                  : "opacity-75"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-xl p-3 ${
                      achievement.unlocked ? "bg-warning text-warning-foreground" : "bg-muted"
                    }`}
                  >
                    {achievement.unlocked ? (
                      <achievement.icon className="h-6 w-6" />
                    ) : (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  {achievement.unlocked && (
                    <Badge className="bg-warning text-warning-foreground">Unlocked!</Badge>
                  )}
                </div>
                <CardTitle className="mt-2">{achievement.title}</CardTitle>
                <CardDescription>{achievement.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={achievement.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{achievement.progress}%</span>
                    {achievement.current !== undefined && achievement.target && (
                      <span>
                        {achievement.current} / {achievement.target}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon */}
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">More Achievements Coming Soon!</h3>
            <p className="text-muted-foreground max-w-md">
              Keep studying and completing tasks. New achievements and challenges will be added regularly.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
