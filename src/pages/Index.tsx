import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Clock, Swords, Trophy, Users } from "lucide-react";
import { differenceInSeconds, format } from "date-fns";

const Index = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .in("status", ["upcoming", "active"])
        .order("start_timestamp", { ascending: true });
      if (data) setTournaments(data);
    };
    fetchTournaments();

    const channel = supabase
      .channel("tournaments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => {
        fetchTournaments();
      })
      .subscribe();

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCountdown = (targetDate: string) => {
    const diff = differenceInSeconds(new Date(targetDate), now);
    if (diff <= 0) return "NOW";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const activeTournaments = tournaments.filter(t => t.status === "active");
  const upcomingTournaments = tournaments.filter(t => t.status === "upcoming");

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

      <div className="container pb-16 space-y-12">
        {/* Active Tournaments */}
        {activeTournaments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Swords className="h-5 w-5 text-gold" />
              <h2 className="font-display text-2xl font-semibold text-foreground">Active Battles</h2>
              <Badge variant="outline" className="border-gold/50 text-gold animate-pulse-gold">LIVE</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {activeTournaments.map(t => (
                <Card key={t.id} className="border-gold/20 bg-card hover:border-gold/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-xl">{t.title}</CardTitle>
                      <Badge className="bg-gold text-gold-foreground">ACTIVE</Badge>
                    </div>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Ends in: <span className="text-gold font-mono font-bold">{formatCountdown(t.end_timestamp)}</span></span>
                      </div>
                      <Button
                        onClick={() => navigate(`/tournament/${t.id}`)}
                        className="bg-gold text-gold-foreground hover:bg-gold/90"
                      >
                        Enter Battle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Tournaments */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-5 w-5 text-bronze" />
            <h2 className="font-display text-2xl font-semibold text-foreground">Upcoming Tournaments</h2>
          </div>
          {upcomingTournaments.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No upcoming tournaments scheduled. Check back soon.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingTournaments.map(t => (
                <Card key={t.id} className="bg-card border-border hover:border-gold/20 transition-colors">
                  <CardHeader>
                    <CardTitle className="font-display text-lg">{t.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Starts: {format(new Date(t.start_timestamp), "MMM d, yyyy HH:mm")} UTC</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Duration: {t.time_limit_minutes} minutes
                    </div>
                    <div className="text-gold font-mono text-lg font-bold">
                      {formatCountdown(t.start_timestamp)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Index;
