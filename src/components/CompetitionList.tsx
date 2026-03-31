import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Swords, Trophy, Users, ExternalLink, BookOpen, FlaskConical, UserPlus, CheckCircle, XCircle, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import { formatIST } from "@/lib/dateUtils";

const typeIcon: Record<string, any> = { tournament: Swords, olympiad: BookOpen, jee: FlaskConical };
const typeLabel: Record<string, string> = { tournament: "Tournament", olympiad: "Olympiad", jee: "JEE Mock" };
const typeColor: Record<string, string> = {
  tournament: "bg-gold/20 text-gold border-gold/30",
  olympiad: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  jee: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

interface CompetitionListProps {
  tournamentType: "tournament" | "olympiad" | "jee";
  title: string;
  subtitle: string;
}

const CompetitionList = ({ tournamentType, title, subtitle }: CompetitionListProps) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [myRegistrations, setMyRegistrations] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeScrollRef = useRef<HTMLDivElement>(null);
  const upcomingScrollRef = useRef<HTMLDivElement>(null);

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("tournament_type", tournamentType)
      .in("status", ["upcoming", "active"])
      .order("start_timestamp", { ascending: true });
    if (data) {
      setTournaments(data);
      // Fetch question counts
      const ids = data.map(t => t.id);
      if (ids.length > 0) {
        const { data: tqs } = await supabase.from("tournament_questions").select("tournament_id").in("tournament_id", ids);
        if (tqs) {
          const counts: Record<string, number> = {};
          tqs.forEach((tq: any) => { counts[tq.tournament_id] = (counts[tq.tournament_id] || 0) + 1; });
          setQuestionCounts(counts);
        }
      }
    }
  };

  const fetchParticipants = async () => {
    const { data: tourns } = await supabase
      .from("tournaments")
      .select("id")
      .eq("tournament_type", tournamentType)
      .in("status", ["upcoming", "active"]);
    if (tourns && tourns.length > 0) {
      const ids = tourns.map(t => t.id);
      const { data } = await supabase.from("tournament_participants").select("tournament_id").in("tournament_id", ids);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((p: any) => { counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1; });
        setParticipantCounts(counts);
      }
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
      .channel(`${tournamentType}-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `tournament_type=eq.${tournamentType}` }, () => fetchTournaments())
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_participants" }, () => fetchParticipants())
      .subscribe();

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, [user, tournamentType]);

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
      tournament_id: tournamentId, user_id: user.id,
    });
    if (error) {
      if (error.code === "23505") toast.info("Already registered!");
      else toast.error("Registration failed: " + error.message);
    } else {
      toast.success("Registered successfully!");
      fetchParticipants();
    }
  };

  const unregister = async (tournamentId: string) => {
    if (!user) return;
    await supabase.from("tournament_participants").delete()
      .eq("tournament_id", tournamentId).eq("user_id", user.id);
    toast.success("Registration cancelled.");
    fetchParticipants();
  };

  const scroll = (ref: React.RefObject<HTMLDivElement>, dir: "left" | "right") => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  };

  const Icon = typeIcon[tournamentType] || Swords;
  const activeTournaments = tournaments.filter(t => t.status === "active");
  const upcomingTournaments = tournaments.filter(t => t.status === "upcoming");

  const renderCard = (t: any, isActive: boolean) => {
    const isRegistered = myRegistrations.has(t.id);
    const qCount = questionCounts[t.id] || 0;
    return (
      <div key={t.id} className="min-w-[320px] max-w-[380px] flex-shrink-0 snap-start">
        <Card className={`bg-card border-border hover:border-gold/20 transition-all h-full ${isActive ? "border-gold/20 shadow-lg shadow-gold/5" : ""}`}>
          <CardHeader className="pb-3">
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
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {isActive ? (
                  <span>Ends: <span className="text-gold font-mono font-bold">{formatCountdown(t.end_timestamp)}</span></span>
                ) : (
                  <span>{formatIST(t.start_timestamp)}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{participantCounts[t.id] || 0}</span>
              </div>
              {qCount > 0 && (
                <div className="flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                  <span>{qCount} Q</span>
                </div>
              )}
            </div>

            {!isActive && (
              <div className="text-gold font-mono text-xl font-bold tracking-wider">
                ⏱ {formatCountdown(t.start_timestamp)}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {isActive ? (
                <Button onClick={() => navigate(`/tournament/${t.id}`)} className="bg-gold text-gold-foreground hover:bg-gold/90">
                  <Swords className="h-4 w-4 mr-1" /> Enter Battle
                </Button>
              ) : isRegistered ? (
                <div className="flex items-center gap-2">
                  <Button disabled variant="outline" className="text-green-400 border-green-500/30">
                    <CheckCircle className="h-4 w-4 mr-1" /> Registered
                  </Button>
                  <Button onClick={() => unregister(t.id)} variant="ghost" size="sm" className="text-destructive text-xs">
                    <XCircle className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                </div>
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

            <div className="text-xs text-muted-foreground">Duration: {t.time_limit_minutes} min</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const HorizontalStrip = ({ items, isActive, scrollRef }: { items: any[]; isActive: boolean; scrollRef: React.RefObject<HTMLDivElement> }) => (
    <div className="relative group">
      {items.length > 2 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll(scrollRef, "left")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll(scrollRef, "right")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map(t => renderCard(t, isActive))}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="relative py-16 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(228_35%_12%)_0%,_transparent_60%)]" />
        <div className="relative container">
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-wide text-foreground mb-4">{title}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{subtitle}</p>
        </div>
      </section>

      <div className="container pb-16 space-y-8">
        {activeTournaments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Icon className="h-5 w-5 text-gold" />
              <h2 className="font-display text-2xl font-semibold text-foreground">Active Now</h2>
              <Badge variant="outline" className="border-gold/50 text-gold animate-pulse-gold">LIVE</Badge>
              <Badge variant="outline" className="text-muted-foreground">{activeTournaments.length}</Badge>
            </div>
            <HorizontalStrip items={activeTournaments} isActive={true} scrollRef={activeScrollRef} />
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-2xl font-semibold text-foreground">Upcoming</h2>
            <Badge variant="outline" className="text-muted-foreground">{upcomingTournaments.length}</Badge>
          </div>
          {upcomingTournaments.length > 0 ? (
            <HorizontalStrip items={upcomingTournaments} isActive={false} scrollRef={upcomingScrollRef} />
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No upcoming {typeLabel[tournamentType]}s. Check back soon.</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
};

export default CompetitionList;
