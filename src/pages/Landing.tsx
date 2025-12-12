import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Calendar, Target, MessageSquare, Trophy, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "AI-powered timetable generation that adapts to your learning style and peak productivity hours.",
  },
  {
    icon: Target,
    title: "Task Management",
    description: "Organize your assignments, set priorities, and track progress with intelligent reminders.",
  },
  {
    icon: MessageSquare,
    title: "Explainable AI Assistant",
    description: "Get help with studies while understanding exactly how and why the AI reached its conclusions.",
  },
  {
    icon: Trophy,
    title: "Gamified Progress",
    description: "Earn achievements, track streaks, and stay motivated with our reward system.",
  },
];

const benefits = [
  "Personalized study schedules based on your goals",
  "AI that explains its reasoning with sources",
  "Track study sessions and analyze patterns",
  "Upload and organize your notes seamlessly",
  "Dark mode for late-night study sessions",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full glass border-b border-border/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg focus-gradient">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold focus-gradient-text">FocusPlus</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="focus-gradient">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Powered by Explainable AI</span>
            </div>
            
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              Study Smarter with
              <span className="block focus-gradient-text">Transparent AI</span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
              FocusPlus is your intelligent study companion that not only helps you learn 
              but shows you exactly how it thinks. Plan, track, and achieve your academic goals 
              with AI you can trust.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="focus-gradient gap-2 px-8 text-lg">
                  Start Learning Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="px-8 text-lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Everything You Need to
              <span className="focus-gradient-text"> Excel</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Comprehensive tools designed to help you study more effectively and understand exactly how AI assists you.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl focus-gradient">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                Why Students Love
                <span className="focus-gradient-text"> FocusPlus</span>
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Join thousands of students who have transformed their study habits with our AI-powered platform.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <div className="h-3 w-3 rounded-full bg-warning" />
                  <div className="h-3 w-3 rounded-full bg-success" />
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">AI Analysis</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      "Based on your notes about photosynthesis, I've identified 3 key concepts you should review..."
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-primary">Reasoning</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sources: lecture_notes.pdf (chunk 42), textbook_ch3.md
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl focus-gradient opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl rounded-3xl focus-gradient p-12">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
              Ready to Transform Your Studies?
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/80">
              Join FocusPlus today and experience AI-powered learning with complete transparency.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="px-8 text-lg">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FocusPlus. Your intelligent study companion.</p>
        </div>
      </footer>
    </div>
  );
}
