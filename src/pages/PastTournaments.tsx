import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Trophy, Clock, Users, ExternalLink, BookOpen, FlaskConical, Swords, Eye } from "lucide-react";
import { format } from "date-fns";

const PastTournaments = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "completed")
        .order("end_timestamp", { ascending: false });
      if (data) setTournaments(data);

      const { data: parts } = await supabase.from("tournament_participants").select("tournament_id");
      if (parts) {
        const counts: Record<string, number> = {};
        parts.forEach((p: any) => { counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1; });
        setParticipantCounts(counts);
      }
    };
    fetch();
  }, []);

  const typeIcon: Record<string, any> = { tournament: Swords, olympiad: BookOpen, jee: FlaskConical };
  const typeLabel: Record<string, string> = { tournament: "Tournament", olympiad: "Olympiad", jee: "JEE Mock" };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-gold" />
        <h1 className="font-display text-3xl font-bold text-foreground">Past Competitions</h1>
      </div>

      {tournaments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No completed competitions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(t => {
            const Icon = typeIcon[t.tournament_type] || Swords;
            return (
              <Card key={t.id} className="bg-card border-border hover:border-gold/20 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="font-display text-lg">{t.title}</CardTitle>
                    </div>
                    <Badge variant="outline">{typeLabel[t.tournament_type] || "Tournament"}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(t.end_timestamp), "MMM d, yyyy")}</span>
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
      )}
    </div>
  );
};

export default PastTournaments;
