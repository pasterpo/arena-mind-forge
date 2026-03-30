import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TierBadge } from "@/components/TierBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy, TrendingUp, AlertTriangle, Hash, Swords, Eye, Pencil, Check, X, Target, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const viewingUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [profile, setProfile] = useState<any>(null);
  const [eloHistory, setEloHistory] = useState<any[]>([]);
  const [pastTournaments, setPastTournaments] = useState<any[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [tournamentStats, setTournamentStats] = useState({ total: 0, wins: 0 });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [categoryAccuracy, setCategoryAccuracy] = useState<Record<string, { correct: number; total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [winsLoading, setWinsLoading] = useState(false);

  useEffect(() => {
    if (!viewingUserId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", viewingUserId).single();
      if (p) { setProfile(p); setNewUsername(p.username || ""); }

      const { data: h } = await supabase
        .from("elo_history")
        .select("*, tournaments(title)")
        .eq("user_id", viewingUserId)
        .order("created_at", { ascending: true });
      if (h) setEloHistory(h);

      const { data: parts } = await supabase
        .from("tournament_participants")
        .select("tournament_id, tournaments(*)")
        .eq("user_id", viewingUserId);

      if (parts) {
        const completed = parts
          .filter((p: any) => p.tournaments?.status === "completed")
          .map((p: any) => p.tournaments);
        setPastTournaments(completed);

        setWinsLoading(true);
        let wins = 0;
        for (const t of completed) {
          const { data } = await supabase.rpc("get_tournament_results", { p_tournament_id: t.id });
          if (data && data.length > 0 && data[0].user_id === viewingUserId) wins++;
        }
        setTournamentStats({ total: completed.length, wins });
        setWinsLoading(false);
      }

      // Calculate accuracy
      const { data: allSubs } = await supabase.from("submissions").select("is_correct").eq("user_id", viewingUserId);
      if (allSubs && allSubs.length > 0) {
        const correct = allSubs.filter(s => s.is_correct).length;
        setAccuracy(Math.round((correct / allSubs.length) * 100));
      }

      // Category accuracy
      const categories = ["number_theory", "algebra", "combinatorics", "geometry"];
      const catAcc: Record<string, { correct: number; total: number }> = {};
      for (const cat of categories) {
        const { data: catSubs } = await supabase
          .from("submissions")
          .select("is_correct, question_bank!inner(category)")
          .eq("user_id", viewingUserId)
          .eq("question_bank.category" as any, cat);
        if (catSubs && catSubs.length > 0) {
          catAcc[cat] = { correct: catSubs.filter((s: any) => s.is_correct).length, total: catSubs.length };
        }
      }
      setCategoryAccuracy(catAcc);

      setLoading(false);
    };
    fetchData();
  }, [viewingUserId]);

  const saveUsername = async () => {
    if (!newUsername.trim() || !user) return;
    const trimmed = newUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      toast.error("Username must be 3-20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      toast.error("Username can only contain letters, numbers, _ or -");
      return;
    }
    const { data: existing } = await supabase.from("profiles").select("id").eq("username", trimmed).neq("id", user.id);
    if (existing && existing.length > 0) {
      toast.error("This username is already taken.");
      return;
    }
    const { error } = await supabase.from("profiles").update({ username: trimmed }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      setProfile({ ...profile, username: trimmed });
      setEditingName(false);
      toast.success("Username updated!");
    }
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-5"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!profile) return <div className="container py-16 text-center text-muted-foreground">Profile not found.</div>;

  const chartData = eloHistory.length > 0
    ? [{ name: "Start", elo: 1200 }, ...eloHistory.map((h: any) => ({ name: h.tournaments?.title || "Tournament", elo: h.elo_after }))]
    : [];

  const categoryNames: Record<string, string> = {
    number_theory: "Number Theory",
    algebra: "Algebra",
    combinatorics: "Combinatorics",
    geometry: "Geometry",
  };

  return (
    <div className="container py-8 space-y-6">
      <h1 className="font-display text-3xl font-bold text-foreground">
        {isOwnProfile ? "Your Profile" : `${profile.username || "Anonymous"}'s Profile`}
      </h1>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans">Username</CardTitle>
          </CardHeader>
          <CardContent>
            {isOwnProfile && editingName ? (
              <div className="flex items-center gap-2">
                <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="bg-secondary border-border h-8 text-sm" />
                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400" onClick={saveUsername}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setEditingName(false); setNewUsername(profile.username || ""); }}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold text-foreground">{profile.username || "Anonymous"}</p>
                {isOwnProfile && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingName(true)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{profile.email}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Elo Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-gold">{profile.elo_rating}</p>
            <TierBadge elo={profile.elo_rating} />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans flex items-center gap-1"><Hash className="h-4 w-4" /> Global Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-foreground">#{profile.global_rank || "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tournamentStats.total} played • {winsLoading ? <Loader2 className="inline h-3 w-3 animate-spin" /> : `${tournamentStats.wins} wins`}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans flex items-center gap-1"><Target className="h-4 w-4" /> Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-mono text-foreground">{accuracy !== null ? `${accuracy}%` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Overall correct rate</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-sans flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Penalty Strikes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold font-mono ${profile.penalty_strikes > 0 ? "text-destructive" : "text-green-400"}`}>
              {profile.penalty_strikes}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{profile.account_status === "active" ? "✅ Active" : "🚫 Suspended"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Accuracy */}
      {Object.keys(categoryAccuracy).length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2"><Target className="h-5 w-5 text-gold" /> Accuracy by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {Object.entries(categoryNames).map(([key, label]) => {
                const acc = categoryAccuracy[key];
                return (
                  <div key={key} className="bg-secondary/30 rounded-lg p-4 text-center border border-border">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {acc ? (
                      <>
                        <p className="text-2xl font-bold font-mono text-gold">{Math.round((acc.correct / acc.total) * 100)}%</p>
                        <p className="text-xs text-muted-foreground">{acc.correct}/{acc.total} correct</p>
                      </>
                    ) : (
                      <p className="text-lg font-mono text-muted-foreground">—</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Rating Progression</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 20% 18%)" />
                <XAxis dataKey="name" stroke="hsl(215 15% 55%)" fontSize={12} />
                <YAxis stroke="hsl(215 15% 55%)" fontSize={12} domain={['dataMin - 50', 'dataMax + 50']} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(228 35% 9%)", border: "1px solid hsl(228 20% 18%)", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(213 31% 95%)" }}
                  itemStyle={{ color: "hsl(42, 55%, 58%)" }}
                />
                <Line type="monotone" dataKey="elo" stroke="hsl(42, 55%, 58%)" strokeWidth={2} dot={{ fill: "hsl(42, 55%, 58%)", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Your Elo journey starts with your first completed tournament!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Swords className="h-5 w-5 text-amber-700" /> Past Competitions
            <Badge variant="outline" className="ml-auto">{pastTournaments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastTournaments.length > 0 ? (
            <div className="space-y-2">
              {pastTournaments.map((t: any) => {
                const eloEntry = eloHistory.find(h => h.tournament_id === t.id);
                const eloChange = eloEntry ? eloEntry.elo_after - eloEntry.elo_before : null;
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div>
                      <p className="font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.end_timestamp), "MMM d, yyyy")}
                        {eloChange !== null && (
                          <span className={`ml-2 font-mono font-bold ${eloChange >= 0 ? "text-green-400" : "text-destructive"}`}>
                            {eloChange >= 0 ? "+" : ""}{eloChange} Elo
                          </span>
                        )}
                      </p>
                    </div>
                    <Link to={`/results/${t.id}`}>
                      <Button variant="ghost" size="sm" className="text-gold hover:text-gold/80">
                        <Eye className="h-4 w-4 mr-1" /> Results
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No past competitions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
