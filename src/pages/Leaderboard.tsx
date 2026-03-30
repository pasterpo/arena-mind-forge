import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TierBadge } from "@/components/TierBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Trophy, Users, Swords, BookOpen, FlaskConical } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const Leaderboard = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [categoryTab, setCategoryTab] = useState("global");

  useEffect(() => {
    const fetchGlobal = async () => {
      setLoading(true);
      const { data, count } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("account_status", "active")
        .order("elo_rating", { ascending: false })
        .limit(200);
      if (data) setProfiles(data);
      if (count) setTotalUsers(count);
      setLoading(false);
    };
    fetchGlobal();

    const channel = supabase
      .channel("leaderboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchGlobal();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (categoryTab === "global") return;
    const fetchCategory = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_category_leaderboard", {
        p_type: categoryTab as any,
        p_limit: 100,
      });
      setCategoryData(data || []);
      setLoading(false);
    };
    fetchCategory();
  }, [categoryTab]);

  // BUG-04 FIX: Compute rank from unfiltered list
  const rankedProfiles = profiles.map((p, i) => ({ ...p, displayRank: p.global_rank || i + 1 }));
  const filtered = rankedProfiles.filter(p =>
    !search || (p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredCategory = categoryData.filter(p =>
    !search || (p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-gold" />
        <h1 className="font-display text-3xl font-bold text-foreground">Global Leaderboard</h1>
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {totalUsers} competitors
        </Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      <Tabs value={categoryTab} onValueChange={setCategoryTab} className="space-y-4">
        <TabsList className="bg-secondary border border-border h-auto gap-1 p-1">
          <TabsTrigger value="global" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
            <Trophy className="h-4 w-4 mr-1" /> Global
          </TabsTrigger>
          <TabsTrigger value="tournament" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
            <Swords className="h-4 w-4 mr-1" /> Tournaments
          </TabsTrigger>
          <TabsTrigger value="olympiad" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
            <BookOpen className="h-4 w-4 mr-1" /> Olympiads
          </TabsTrigger>
          <TabsTrigger value="jee" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
            <FlaskConical className="h-4 w-4 mr-1" /> JEE
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          {loading ? (
            <div className="space-y-2">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Elo Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const isMe = p.id === user?.id;
                    return (
                      <TableRow key={p.id} className={`border-border ${isMe ? "bg-gold/5" : ""}`}>
                        <TableCell>
                          <span className={`font-mono font-bold ${p.displayRank <= 3 ? "text-gold" : "text-muted-foreground"}`}>
                            #{p.displayRank}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <Link to={`/profile/${p.id}`} className="hover:text-gold transition-colors">
                            {p.username || "Anonymous"}
                          </Link>
                          {isMe && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                        </TableCell>
                        <TableCell><TierBadge elo={p.elo_rating} /></TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">{p.elo_rating}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No competitors found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {["tournament", "olympiad", "jee"].map(cat => (
          <TabsContent key={cat} value={cat}>
            {loading ? (
              <div className="space-y-2">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Category Points</TableHead>
                      <TableHead className="text-right">Played</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategory.map((p: any, i: number) => {
                      const isMe = p.user_id === user?.id;
                      return (
                        <TableRow key={p.user_id} className={`border-border ${isMe ? "bg-gold/5" : ""}`}>
                          <TableCell>
                            <span className={`font-mono font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>#{i + 1}</span>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <Link to={`/profile/${p.user_id}`} className="hover:text-gold transition-colors">
                              {p.username || "Anonymous"}
                            </Link>
                            {isMe && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                          </TableCell>
                          <TableCell><TierBadge elo={p.elo_rating} /></TableCell>
                          <TableCell className="text-right font-mono font-bold text-foreground">{Number(p.category_points)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{Number(p.tournaments_played)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredCategory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No data yet for this category.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Leaderboard;
