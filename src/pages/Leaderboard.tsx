import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/TierBadge";
import { Search, Trophy, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Leaderboard = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data, count } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("account_status", "active")
        .order("elo_rating", { ascending: false })
        .limit(200);
      if (data) setProfiles(data);
      if (count) setTotalUsers(count);
    };
    fetch();

    const channel = supabase
      .channel("leaderboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = profiles.filter(p =>
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
            {filtered.map((p, i) => {
              const isMe = p.id === user?.id;
              return (
                <TableRow key={p.id} className={`border-border ${isMe ? "bg-gold/5" : ""}`}>
                  <TableCell>
                    <span className={`font-mono font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>
                      #{p.global_rank || i + 1}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {p.username || "Anonymous"}
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
    </div>
  );
};

export default Leaderboard;
