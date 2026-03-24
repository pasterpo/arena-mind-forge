import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const TournamentPanel = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    const { data: t } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    if (t) setTournaments(t);

    const { data: q } = await supabase.from("question_bank").select("*").eq("visibility", "published").order("created_at", { ascending: false });
    if (q) setQuestions(q);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!title || !startTime || !endTime || !user) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    try {
      const { data: t, error } = await supabase.from("tournaments").insert({
        title,
        description,
        start_timestamp: new Date(startTime).toISOString(),
        end_timestamp: new Date(endTime).toISOString(),
        time_limit_minutes: parseInt(timeLimit),
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      if (selectedQuestions.size > 0) {
        const tqRows = Array.from(selectedQuestions).map((qId, i) => ({
          tournament_id: t.id,
          question_id: qId,
          question_order: i + 1,
        }));
        const { error: tqError } = await supabase.from("tournament_questions").insert(tqRows);
        if (tqError) throw tqError;
      }

      toast.success("Tournament created!");
      setTitle(""); setDescription(""); setStartTime(""); setEndTime("");
      setSelectedQuestions(new Set());
      fetchData();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleQuestion = (qId: string) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  const filteredQuestions = categoryFilter
    ? questions.filter(q => q.category === categoryFilter)
    : questions;

  const statusColor: Record<string, string> = {
    upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    active: "bg-gold/20 text-gold border-gold/30",
    completed: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      {/* Create Tournament */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-gold" /> Create Tournament
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tournament Title" className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Time Limit (minutes)</Label>
              <Input value={timeLimit} onChange={e => setTimeLimit(e.target.value)} type="number" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="bg-secondary border-border" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Time (UTC)</Label>
              <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>End Time (UTC)</Label>
              <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>

          {/* Question Selector */}
          <div className="space-y-2">
            <Label>Select Questions ({selectedQuestions.size} selected)</Label>
            <div className="flex gap-2 mb-2">
              {["", "number_theory", "algebra", "combinatorics", "geometry"].map(c => (
                <Button
                  key={c}
                  variant={categoryFilter === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(c)}
                  className={categoryFilter === c ? "bg-gold text-gold-foreground" : ""}
                >
                  {c ? c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "All"}
                </Button>
              ))}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-secondary/30">
              {filteredQuestions.map(q => (
                <label key={q.id} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer">
                  <Checkbox
                    checked={selectedQuestions.has(q.id)}
                    onCheckedChange={() => toggleQuestion(q.id)}
                  />
                  <span className="text-sm text-foreground truncate">
                    {q.category} — Difficulty {q.difficulty_weight}/10 — {q.answer_type}
                  </span>
                </label>
              ))}
              {filteredQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No published questions available.</p>
              )}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={creating} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
            {creating ? "Creating..." : "Create Tournament"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Tournaments */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Existing Tournaments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tournaments.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div>
                  <p className="font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.time_limit_minutes} min</p>
                </div>
                <Badge className={statusColor[t.status] || ""}>
                  {t.status}
                </Badge>
              </div>
            ))}
            {tournaments.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No tournaments yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentPanel;
