import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Swords, Trophy, Users, ExternalLink, BookOpen, FlaskConical, UserPlus, CheckCircle } from "lucide-react";
import { differenceInSeconds, format } from "date-fns";
import { toast } from "sonner";

const Index = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [myRegistrations, setMyRegistrations] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .in("status", ["upcoming", "active"])
      .order("start_timestamp", { ascending: true });
    if (data) setTournaments(data);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase.from("tournament_participants").select("tournament_id");
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((p: any) => {
        counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1;
      });
      setParticipantCounts(counts);
    }
    if (user) {
      const { data: mine } = await supabase
        .from("tournament_participants")
        .select("tournament_id")
        .eq("user_id", user.id);
      if (mine) setMyRegistrations(new Set(mine.map((m: any) => m.tournament_id)));
    }
  };

  useEffect(() => {
    fetchTournaments();
    fetchParticipants();

    const channel = supabase
      .channel("tournaments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () => fetchTournaments())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participants" }, () => fetchParticipants())
      .subscribe();

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, [user]);

  const formatCountdown = (targetDate: string) => {
    const diff = differenceInSeconds(new Date(targetDate), now);
    if (diff <= 0) return "NOW";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const registerForTournament = async (tournamentId: string) => {
    if (!user) return;
    const { error } = await supabase.from("tournament_participants").insert({
      tournament_id: tournamentId,
      user_id: user.id,
    });
    if (error) {
      if (error.code === "23505") toast.info("Already registered!");
      else toast.error("Registration failed: " + error.message);
    } else {
      toast.success("Registered successfully!");
      fetchParticipants();
    }
  };

  const typeIcon: Record<string, any> = {
    tournament: Swords,
    olympiad: BookOpen,
    jee: FlaskConical,
  };

  const typeLabel: Record<string, string> = {
    tournament: "Tournament",
    olympiad: "Olympiad",
    jee: "JEE Mock",
  };

  const typeColor: Record<string, string> = {
    tournament: "bg-gold/20 text-gold border-gold/30",
    olympiad: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    jee: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  const renderTournamentCard = (t: any, isActive: boolean) => {
    const Icon = typeIcon[t.tournament_type] || Swords;
    const isRegistered = myRegistrations.has(t.id);

    return (
      <Card key={t.id} className={`bg-card border-border hover:border-gold/20 transition-colors ${isActive ? "border-gold/20" : ""}`}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Icon className="h-5 w-5 text-gold shrink-0" />
              <CardTitle className="font-display text-lg truncate">{t.title}</CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge className={typeColor[t.tournament_type] || typeColor.tournament}>
                {typeLabel[t.tournament_type] || "Tournament"}
              </Badge>
              {isActive && <Badge className="bg-gold text-gold-foreground animate-pulse-gold">LIVE</Badge>}
            </div>
          </div>
          <CardDescription className="line-clamp-2">{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {isActive ? (
                <span>Ends: <span className="text-gold font-mono font-bold">{formatCountdown(t.end_timestamp)}</span></span>
              ) : (
                <span>Starts: {format(new Date(t.start_timestamp), "MMM d, yyyy HH:mm")} UTC</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{participantCounts[t.id] || 0} registered</span>
            </div>
          </div>

          {!isActive && (
            <div className="text-gold font-mono text-lg font-bold">
              {formatCountdown(t.start_timestamp)}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {isActive ? (
              <Button
                onClick={() => navigate(`/tournament/${t.id}`)}
                className="bg-gold text-gold-foreground hover:bg-gold/90"
              >
                <Swords className="h-4 w-4 mr-1" /> Enter Battle
              </Button>
            ) : isRegistered ? (
              <Button disabled variant="outline" className="text-green-400 border-green-500/30">
                <CheckCircle className="h-4 w-4 mr-1" /> Registered
              </Button>
            ) : (
              <Button onClick={() => registerForTournament(t.id)} variant="outline" className="hover:border-gold/50 hover:text-gold">
                <UserPlus className="h-4 w-4 mr-1" /> Register
              </Button>
            )}
            {t.telegram_link && (
              <a href={t.telegram_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Telegram
              </a>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Duration: {t.time_limit_minutes} min
          </div>
        </CardContent>
      </Card>
    );
  };

  const filterByType = (type: string, status: string) =>
    tournaments.filter(t => t.tournament_type === type && t.status === status);

  const activeTournaments = tournaments.filter(t => t.status === "active");
  const upcomingByType = {
    tournament: filterByType("tournament", "upcoming"),
    olympiad: filterByType("olympiad", "upcoming"),
    jee: filterByType("jee", "upcoming"),
  };

  const activeByType = {
    tournament: filterByType("tournament", "active"),
    olympiad: filterByType("olympiad", "active"),
    jee: filterByType("jee", "active"),
  };

  const renderSection = (type: string) => {
    const active = activeByType[type as keyof typeof activeByType] || [];
    const upcoming = upcomingByType[type as keyof typeof upcomingByType] || [];
    const all = [...active, ...upcoming];

    if (all.length === 0) {
      return (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No {typeLabel[type] || type}s scheduled. Check back soon.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {all.map(t => renderTournamentCard(t, t.status === "active"))}
      </div>
    );
  };

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

      <div className="container pb-16 space-y-8">
        {/* Live Banner */}
        {activeTournaments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Swords className="h-5 w-5 text-gold" />
              <h2 className="font-display text-2xl font-semibold text-foreground">Active Battles</h2>
              <Badge variant="outline" className="border-gold/50 text-gold animate-pulse-gold">LIVE</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {activeTournaments.map(t => renderTournamentCard(t, true))}
            </div>
          </section>
        )}

        {/* Tabs: Tournament / Olympiad / JEE */}
        <Tabs defaultValue="tournament" className="space-y-6">
          <TabsList className="bg-secondary border border-border h-auto gap-1 p-1">
            <TabsTrigger value="tournament" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground gap-1">
              <Swords className="h-4 w-4" /> Tournaments
            </TabsTrigger>
            <TabsTrigger value="olympiad" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground gap-1">
              <BookOpen className="h-4 w-4" /> Olympiads
            </TabsTrigger>
            <TabsTrigger value="jee" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground gap-1">
              <FlaskConical className="h-4 w-4" /> JEE Mocks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournament">{renderSection("tournament")}</TabsContent>
          <TabsContent value="olympiad">{renderSection("olympiad")}</TabsContent>
          <TabsContent value="jee">{renderSection("jee")}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
