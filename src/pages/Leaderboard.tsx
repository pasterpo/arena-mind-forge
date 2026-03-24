import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { TierBadge } from "@/components/TierBadge";
import { Search, Trophy } from "lucide-react";

const Leaderboard = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("account_status", "active")
        .order("elo_rating", { ascending: false })
        .limit(100);
      if (data) setProfiles(data);
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
            {filtered.map((p, i) => (
              <TableRow key={p.id} className="border-border">
                <TableCell>
                  <span className={`font-mono font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>
                    #{p.global_rank || i + 1}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-foreground">{p.username || "Anonymous"}</TableCell>
                <TableCell><TierBadge elo={p.elo_rating} /></TableCell>
                <TableCell className="text-right font-mono font-bold text-foreground">{p.elo_rating}</TableCell>
              </TableRow>
            ))}
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
