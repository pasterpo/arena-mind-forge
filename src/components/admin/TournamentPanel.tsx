import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Plus, ExternalLink, Play, CheckCircle2, Trash2, Users, Pencil, ChevronDown, ChevronUp, Zap } from "lucide-react";

interface TournamentPanelProps {
  fixedType?: "tournament" | "olympiad" | "jee";
}

const TournamentPanel = ({ fixedType }: TournamentPanelProps = {}) => {
  const { user, isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [telegramLink, setTelegramLink] = useState("");
  const [tournamentType, setTournamentType] = useState<string>(fixedType || "tournament");
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<string | null>(null);
  const [tournamentQuestions, setTournamentQuestions] = useState<any[]>([]);
  const [editTournament, setEditTournament] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTelegram, setEditTelegram] = useState("");
  const [editTimeLimit, setEditTimeLimit] = useState("60");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const fetchData = async () => {
    let query = supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    if (fixedType) query = query.eq("tournament_type", fixedType);
    const { data: t } = await query;
    if (t) setTournaments(t);

    const { data: q } = await supabase.from("question_bank").select("*").eq("visibility", "published").order("created_at", { ascending: false });
    if (q) setQuestions(q);

    if (t && t.length > 0) {
      const ids = t.map(tour => tour.id);
      const { data: parts } = await supabase.from("tournament_participants").select("tournament_id").in("tournament_id", ids);
      if (parts) {
        const counts: Record<string, number> = {};
        parts.forEach((p: any) => { counts[p.tournament_id] = (counts[p.tournament_id] || 0) + 1; });
        setParticipantCounts(counts);
      }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!title || !startTime || !endTime || !user) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    try {
      const insertData: any = {
        title, description,
        start_timestamp: new Date(startTime).toISOString(),
        end_timestamp: new Date(endTime).toISOString(),
        time_limit_minutes: parseInt(timeLimit),
        created_by: user.id,
        tournament_type: tournamentType,
      };
      if (telegramLink.trim()) insertData.telegram_link = telegramLink.trim();

      const { data: t, error } = await supabase.from("tournaments").insert(insertData).select().single();
      if (error) throw error;

      if (selectedQuestions.size > 0) {
        const tqRows = Array.from(selectedQuestions).map((qId, i) => ({
          tournament_id: t.id, question_id: qId, question_order: i + 1,
        }));
        await supabase.from("tournament_questions").insert(tqRows);
      }

      toast.success("Created successfully!");
      setTitle(""); setDescription(""); setStartTime(""); setEndTime(""); setTelegramLink("");
      setSelectedQuestions(new Set());
      fetchData();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setConfirmAction({
      title: `Mark as ${status}`,
      description: `Are you sure you want to mark this competition as ${status}?`,
      onConfirm: async () => {
        const { error } = await supabase.from("tournaments").update({ status: status as any }).eq("id", id);
        if (error) {
          toast.error("Error: " + error.message);
        } else {
          if (status === "completed") {
            const { error: eloErr } = await supabase.rpc("calculate_elo_changes", { p_tournament_id: id });
            if (eloErr) toast.error("Elo error: " + eloErr.message);
            else {
              await supabase.rpc("update_global_ranks");
              toast.success("Tournament completed. Elo ratings and global ranks updated.");
            }
          } else {
            toast.success(`Marked as ${status}.`);
          }
          fetchData();
        }
        setConfirmAction(null);
      },
    });
  };

  const deleteTournament = async (id: string) => {
    setConfirmAction({
      title: "Delete Competition",
      description: "Delete this competition permanently? This will also remove all associated questions.",
      onConfirm: async () => {
        await supabase.from("tournament_questions").delete().eq("tournament_id", id);
        await supabase.from("tournaments").delete().eq("id", id);
        toast.success("Deleted.");
        fetchData();
        setConfirmAction(null);
      },
    });
  };

  const toggleQuestion = (qId: string) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  };

  const viewQuestions = async (tournamentId: string) => {
    if (expandedQuestions === tournamentId) {
      setExpandedQuestions(null);
      return;
    }
    const { data } = await supabase.from("tournament_questions").select("*, question_bank(*)").eq("tournament_id", tournamentId).order("question_order");
    setTournamentQuestions(data || []);
    setExpandedQuestions(tournamentId);
  };

  const removeQuestion = async (tqId: string, tournamentId: string) => {
    await supabase.from("tournament_questions").delete().eq("id", tqId);
    toast.success("Question removed.");
    viewQuestions(tournamentId);
  };

  const openEdit = (t: any) => {
    setEditTournament(t);
    setEditTitle(t.title);
    setEditDescription(t.description || "");
    setEditTelegram(t.telegram_link || "");
    setEditTimeLimit(String(t.time_limit_minutes));
    setEditStart(new Date(t.start_timestamp).toISOString().slice(0, 16));
    setEditEnd(new Date(t.end_timestamp).toISOString().slice(0, 16));
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editTournament) return;
    const updates: any = {
      title: editTitle,
      description: editDescription,
      telegram_link: editTelegram || null,
      time_limit_minutes: parseInt(editTimeLimit),
    };
    if (editTournament.status === "upcoming") {
      updates.start_timestamp = new Date(editStart).toISOString();
      updates.end_timestamp = new Date(editEnd).toISOString();
    }
    await supabase.from("tournaments").update(updates).eq("id", editTournament.id);
    toast.success("Competition updated.");
    setEditDialogOpen(false);
    fetchData();
  };

  const filteredQuestions = categoryFilter ? questions.filter(q => q.category === categoryFilter) : questions;
  const statusColor: Record<string, string> = {
    upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    active: "bg-gold/20 text-gold border-gold/30",
    completed: "bg-muted text-muted-foreground border-border",
  };
  const typeLabel: Record<string, string> = { tournament: "Tournament", olympiad: "Olympiad", jee: "JEE Mock" };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-gold" /> Create {fixedType ? typeLabel[fixedType] || "Competition" : "Competition"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${fixedType ? typeLabel[fixedType] : "Competition"} Title`} className="bg-secondary border-border" />
            </div>
            {!fixedType && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={tournamentType} onValueChange={setTournamentType}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tournament">Tournament</SelectItem>
                    <SelectItem value="olympiad">Olympiad</SelectItem>
                    <SelectItem value="jee">JEE Mock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Time Limit (minutes)</Label>
              <Input value={timeLimit} onChange={e => setTimeLimit(e.target.value)} type="number" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Telegram Link (optional — shown publicly)</Label>
            <Input value={telegramLink} onChange={e => setTelegramLink(e.target.value)} placeholder="https://t.me/YourChannel" className="bg-secondary border-border" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Time (your local time)</Label>
              <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>End Time (your local time)</Label>
              <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-secondary border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select Questions ({selectedQuestions.size} selected)</Label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {["", "number_theory", "algebra", "combinatorics", "geometry"].map(c => (
                <Button key={c} variant={categoryFilter === c ? "default" : "outline"} size="sm" onClick={() => setCategoryFilter(c)}
                  className={categoryFilter === c ? "bg-gold text-gold-foreground" : ""}>
                  {c ? c.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "All"}
                </Button>
              ))}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-secondary/30">
              {filteredQuestions.map(q => (
                <label key={q.id} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer">
                  <Checkbox checked={selectedQuestions.has(q.id)} onCheckedChange={() => toggleQuestion(q.id)} />
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
            {creating ? "Creating..." : "Create Competition"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">All {fixedType ? typeLabel[fixedType] + "s" : "Competitions"}</CardTitle>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={async () => {
                await supabase.rpc("auto_complete_tournaments");
                await supabase.rpc("update_global_ranks");
                fetchData();
                toast.success("Auto-completed all expired tournaments and updated Elo ratings.");
              }} className="gap-1">
                <Zap className="h-4 w-4" /> Auto-Complete Expired
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tournaments.map(t => (
              <div key={t.id} className="p-4 rounded-lg bg-secondary/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{t.title}</p>
                      <Badge className={statusColor[t.status] || ""}>{t.status}</Badge>
                      <Badge variant="outline">{typeLabel[t.tournament_type] || "Tournament"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.time_limit_minutes} min • {t.description || "No description"} •
                      <Users className="inline h-3 w-3 mx-1" />{participantCounts[t.id] || 0} participants
                    </p>
                    {t.telegram_link && (
                      <a href={t.telegram_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" /> {t.telegram_link}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => viewQuestions(t.id)} className="text-muted-foreground">
                      {expandedQuestions === t.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="ml-1 text-xs">Questions</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    {t.status === "upcoming" && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(t.id, "active")} className="text-green-400 hover:text-green-300">
                        <Play className="h-4 w-4 mr-1" /> Activate
                      </Button>
                    )}
                    {t.status === "active" && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(t.id, "completed")} className="text-gold hover:text-gold/80">
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Complete
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => deleteTournament(t.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {expandedQuestions === t.id && (
                  <div className="mt-2 p-3 rounded bg-secondary/20 border border-border space-y-2">
                    <p className="text-xs text-muted-foreground font-semibold">{tournamentQuestions.length} questions assigned</p>
                    {tournamentQuestions.map((tq: any) => (
                      <div key={tq.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          #{tq.question_order} — {tq.question_bank?.category?.replace("_", " ")} — Difficulty {tq.question_bank?.difficulty_weight}/10
                        </span>
                        {t.status === "upcoming" && (
                          <Button variant="ghost" size="sm" onClick={() => removeQuestion(tq.id, t.id)} className="text-destructive text-xs h-6">✕</Button>
                        )}
                      </div>
                    ))}
                    {tournamentQuestions.length === 0 && <p className="text-xs text-muted-foreground">No questions assigned yet.</p>}
                  </div>
                )}
              </div>
            ))}
            {tournaments.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No competitions yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Edit Competition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Telegram Link</Label>
              <Input value={editTelegram} onChange={e => setEditTelegram(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Time Limit (minutes)</Label>
              <Input type="number" value={editTimeLimit} onChange={e => setEditTimeLimit(e.target.value)} className="bg-secondary border-border" />
            </div>
            {editTournament?.status === "upcoming" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="bg-secondary border-border" />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Cannot edit times of active/completed competitions.</p>
            )}
            <Button onClick={saveEdit} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.title || ""}
        description={confirmAction?.description || ""}
        onConfirm={confirmAction?.onConfirm || (() => {})}
      />
    </div>
  );
};

export default TournamentPanel;
