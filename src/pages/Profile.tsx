import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/TierBadge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy, TrendingUp, AlertTriangle, Hash, Swords, CheckCircle, XCircle, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [eloHistory, setEloHistory] = useState<any[]>([]);
  const [pastTournaments, setPastTournaments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) setProfile(p);

      const { data: h } = await supabase
        .from("elo_history")
        .select("*, tournaments(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (h) setEloHistory(h);

      // Past tournament participation
      const { data: parts } = await supabase
        .from("tournament_participants")
        .select("tournament_id, tournaments(*)")
        .eq("user_id", user.id);

      if (parts) {
        const completed = parts
          .filter((p: any) => p.tournaments?.status === "completed")
          .map((p: any) => p.tournaments);
        setPastTournaments(completed);
      }
    };
    fetchData();
  }, [user]);

  if (!profile) return <div className="container py-16 text-center text-muted-foreground">Loading profile...</div>;

  const chartData = [
    { name: "Start", elo: 1200 },
    ...eloHistory.map((h: any) => ({ name: h.tournaments?.title || "Tournament", elo: h.elo_after })),
  ];

  return (
    <div className="container py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold text-foreground">Competitor Profile</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans">Username</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-foreground">{profile.username}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Elo Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-gold">{profile.elo_rating}</p>
            <TierBadge elo={profile.elo_rating} />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans flex items-center gap-1">
              <Hash className="h-4 w-4" /> Global Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-foreground">#{profile.global_rank || "—"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" /> Penalty Strikes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-destructive">{profile.penalty_strikes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Elo Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" /> Rating Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 20% 18%)" />
                <XAxis dataKey="name" stroke="hsl(215 15% 55%)" fontSize={12} />
                <YAxis stroke="hsl(215 15% 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(228 35% 9%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(213 31% 95%)" }}
                  itemStyle={{ color: "hsl(42 55% 58%)" }}
                />
                <Line type="monotone" dataKey="elo" stroke="hsl(42, 55%, 58%)" strokeWidth={2} dot={{ fill: "hsl(42, 55%, 58%)" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center py-12 text-muted-foreground">No tournament history yet. Compete to see your progression.</p>
          )}
        </CardContent>
      </Card>

      {/* Past Tournaments */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Swords className="h-5 w-5 text-bronze" /> Past Competitions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastTournaments.length > 0 ? (
            <div className="space-y-2">
              {pastTournaments.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div>
                    <p className="font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.end_timestamp), "MMM d, yyyy")}</p>
                  </div>
                  <Link to={`/results/${t.id}`}>
                    <Button variant="ghost" size="sm" className="text-gold hover:text-gold/80">
                      <Eye className="h-4 w-4 mr-1" /> Results
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No past competitions. Enter a tournament to build your history!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
