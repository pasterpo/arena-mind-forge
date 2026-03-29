import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Swords, BookOpen, FlaskConical, Trophy, MessageSquare, History, HelpCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const sections = [
    {
      path: "/tournaments",
      label: "Tournaments",
      icon: Swords,
      description: "Continuous ranked battles. Compete in real-time.",
      color: "text-gold",
    },
    {
      path: "/olympiads",
      label: "Olympiads",
      icon: BookOpen,
      description: "Scheduled olympiad-style challenges. Deep thinking.",
      color: "text-purple-400",
    },
    {
      path: "/jee",
      label: "JEE Mocks",
      icon: FlaskConical,
      description: "JEE-style mock tests. Sharpen under pressure.",
      color: "text-emerald-400",
    },
    {
      path: "/leaderboard",
      label: "Leaderboard",
      icon: Trophy,
      description: "See where you stand. Global Elo rankings.",
      color: "text-gold",
    },
    {
      path: "/discussions",
      label: "Discussions",
      icon: MessageSquare,
      description: "Discuss problems, share strategies, connect.",
      color: "text-blue-400",
    },
    {
      path: "/past",
      label: "Past Competitions",
      icon: History,
      description: "Browse completed tournaments and results.",
      color: "text-muted-foreground",
    },
    {
      path: "/manual",
      label: "Manual & COMA",
      icon: HelpCircle,
      description: "Platform guide, Elo system, and COMA membership.",
      color: "text-gold",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative py-20 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(228_35%_12%)_0%,_transparent_60%)]" />
        <div className="relative container">
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-wide text-foreground mb-4">
            The <span className="text-gold">Arena</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Where mathematical minds clash in competitive excellence. Prove your mastery. Claim your rank.
          </p>
        </div>
      </section>

      <div className="container pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ path, label, icon: Icon, description, color }) => (
            <Card
              key={path}
              className="bg-card border-border hover:border-gold/20 transition-colors cursor-pointer group"
              onClick={() => navigate(path)}
            >
              <CardContent className="pt-8 pb-6 text-center space-y-3">
                <Icon className={`h-10 w-10 mx-auto ${color} group-hover:scale-110 transition-transform`} />
                <h2 className="font-display text-xl font-semibold text-foreground">{label}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
                <Button variant="outline" size="sm" className="hover:border-gold/50 hover:text-gold">
                  Enter →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
