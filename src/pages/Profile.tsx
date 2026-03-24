import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/components/TierBadge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy, TrendingUp, AlertTriangle, Hash } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [eloHistory, setEloHistory] = useState<any[]>([]);

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
    };
    fetchData();
  }, [user]);

  if (!profile) {
    return (
      <div className="container py-16 text-center text-muted-foreground">Loading profile...</div>
    );
  }

  const chartData = [
    { name: "Start", elo: 1200 },
    ...eloHistory.map((h: any) => ({
      name: h.tournaments?.title || "Tournament",
      elo: h.elo_after,
    })),
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
            <p className="text-3xl font-bold font-mono text-foreground">
              #{profile.global_rank || "—"}
            </p>
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
            <Trophy className="h-5 w-5 text-gold" />
            Rating Progression
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
            <p className="text-center py-12 text-muted-foreground">
              No tournament history yet. Compete to see your rating progression.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
