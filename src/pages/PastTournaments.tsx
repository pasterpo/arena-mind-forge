import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Trophy, Clock, Users, ExternalLink, BookOpen, FlaskConical, Swords, Eye, Search, CheckCircle } from "lucide-react";
import { formatIST } from "@/lib/dateUtils";

const PastTournaments = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [myParticipations, setMyParticipations] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "completed")
        .order("end_timestamp", { ascending: false });
      if (data) {
        setTournaments(data);
        // Fetch participant counts only for completed tournaments
        const ids = data.map(t => t.id);
        if (ids.length > 0) {
          const { data: parts } = await supabase.from("tournament_participants").select("tournament_id").in("tournament_id", ids);
          if (parts) {
            const counts: Record<string, number> = {};
            parts.forEach((p: any) => { counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1; });
            setParticipantCounts(counts);
          }
        }
      }
      if (user) {
        const { data: mine } = await supabase.from("tournament_participants").select("tournament_id").eq("user_id", user.id);
        if (mine) setMyParticipations(new Set(mine.map((m: any) => m.tournament_id)));
      }
    };
    fetchData();
  }, [user]);

  const typeIcon: Record<string, any> = { tournament: Swords, olympiad: BookOpen, jee: FlaskConical };
  const typeLabel: Record<string, string> = { tournament: "Tournament", olympiad: "Olympiad", jee: "JEE Mock" };

  const filtered = tournaments.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderCards = (items: any[]) => {
    if (items.length === 0) {
      return (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No completed competitions in this category.</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map(t => {
          const Icon = typeIcon[t.tournament_type] || Swords;
          const competed = myParticipations.has(t.id);
          return (
            <Card key={t.id} className="bg-card border-border hover:border-gold/20 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="font-display text-lg">{t.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">{typeLabel[t.tournament_type] || "Tournament"}</Badge>
                    {competed && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">✅ Competed</Badge>}
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatIST(t.end_timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{participantCounts[t.id] || 0} participants</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/results/${t.id}`}>
                    <Button variant="outline" size="sm" className="hover:border-gold/50 hover:text-gold">
                      <Eye className="h-4 w-4 mr-1" /> View Results
                    </Button>
                  </Link>
                  {t.telegram_link && (
                    <a href={t.telegram_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Telegram
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-gold" />
          <h1 className="font-display text-3xl font-bold text-foreground">Past Competitions</h1>
          <Badge variant="outline">{tournaments.length} total</Badge>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search competitions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-secondary border border-border h-auto gap-1 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">All</TabsTrigger>
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

        <TabsContent value="all">{renderCards(filtered)}</TabsContent>
        <TabsContent value="tournament">{renderCards(filtered.filter(t => t.tournament_type === "tournament"))}</TabsContent>
        <TabsContent value="olympiad">{renderCards(filtered.filter(t => t.tournament_type === "olympiad"))}</TabsContent>
        <TabsContent value="jee">{renderCards(filtered.filter(t => t.tournament_type === "jee"))}</TabsContent>
      </Tabs>
    </div>
  );
};

export default PastTournaments;
