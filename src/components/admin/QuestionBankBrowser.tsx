import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Trash2, Eye, EyeOff, Library, Pencil } from "lucide-react";
import { format } from "date-fns";

interface QuestionBankBrowserProps {
  onSaved?: () => void;
}

const QuestionBankBrowser = ({ onSaved }: QuestionBankBrowserProps) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [editQ, setEditQ] = useState<any>(null);
  const [editAnswer, setEditAnswer] = useState("");
  const [editDifficulty, setEditDifficulty] = useState([5]);
  const [editCategory, setEditCategory] = useState("algebra");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchQuestions = async () => {
    let query = supabase.from("question_bank").select("*").order("created_at", { ascending: false });
    if (categoryFilter !== "all") query = query.eq("category", categoryFilter as any);
    if (visibilityFilter !== "all") query = query.eq("visibility", visibilityFilter as any);
    const { data } = await query;
    if (data) setQuestions(data);
  };

  useEffect(() => { fetchQuestions(); }, [categoryFilter, visibilityFilter]);

  const toggleVisibility = async (id: string, current: string) => {
    const next = current === "published" ? "draft" : "published";
    await supabase.from("question_bank").update({ visibility: next as any }).eq("id", id);
    toast.success(`Question ${next === "published" ? "published" : "set to draft"}.`);
    fetchQuestions();
    onSaved?.();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await supabase.from("tournament_questions").delete().eq("question_id", deleteTarget);
    await supabase.from("question_bank").delete().eq("id", deleteTarget);
    toast.success("Question deleted.");
    setDeleteTarget(null);
    fetchQuestions();
    onSaved?.();
  };

  const openEdit = (q: any) => {
    setEditQ(q);
    setEditAnswer(q.correct_answer);
    setEditDifficulty([q.difficulty_weight]);
    setEditCategory(q.category);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editQ) return;
    await supabase.from("question_bank").update({
      correct_answer: editAnswer,
      difficulty_weight: editDifficulty[0],
      category: editCategory as any,
    }).eq("id", editQ.id);
    toast.success("Question updated.");
    setEditDialogOpen(false);
    fetchQuestions();
    onSaved?.();
  };

  const categoryColors: Record<string, string> = {
    number_theory: "text-purple-400 border-purple-400/30",
    algebra: "text-blue-400 border-blue-400/30",
    combinatorics: "text-green-400 border-green-400/30",
    geometry: "text-orange-400 border-orange-400/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="number_theory">Number Theory</SelectItem>
            <SelectItem value="algebra">Algebra</SelectItem>
            <SelectItem value="combinatorics">Combinatorics</SelectItem>
            <SelectItem value="geometry">Geometry</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="Visibility" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="self-center">{questions.length} questions</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {questions.map(q => (
          <Card key={q.id} className="bg-card border-border overflow-hidden">
            {q.problem_image_url && (
              <div className="h-40 bg-secondary/30 flex items-center justify-center overflow-hidden">
                <img src={q.problem_image_url} alt="Problem" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={categoryColors[q.category] || ""}>{q.category.replace("_", " ")}</Badge>
                <Badge className={q.visibility === "published" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>{q.visibility}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Difficulty: {q.difficulty_weight}/10</span>
                <span>{q.answer_type}</span>
              </div>
              <p className="text-xs text-muted-foreground">Answer: <span className="font-mono text-foreground">{q.correct_answer}</span></p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(new Date(q.created_at), "MMM d, yyyy")}</span>
                <span className="font-mono">✅+{q.difficulty_weight * 5} ❌-{55 - q.difficulty_weight * 5}</span>
              </div>
              <div className="flex gap-1 pt-2">
                <Button variant="ghost" size="sm" onClick={() => toggleVisibility(q.id, q.visibility)}>
                  {q.visibility === "published" ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {q.visibility === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(q.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No questions found. Upload problems in the Problem Forge tab.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Edit Question</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Correct Answer</Label>
              <Input value={editAnswer} onChange={e => setEditAnswer(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Difficulty: {editDifficulty[0]}/10</Label>
              <Slider value={editDifficulty} onValueChange={setEditDifficulty} min={1} max={10} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="number_theory">Number Theory</SelectItem>
                  <SelectItem value="algebra">Algebra</SelectItem>
                  <SelectItem value="combinatorics">Combinatorics</SelectItem>
                  <SelectItem value="geometry">Geometry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveEdit} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Question"
        description="Delete this question permanently? It will be removed from all tournaments it is assigned to."
        onConfirm={handleDeleteConfirm}
        confirmLabel="Delete"
      />
    </div>
  );
};

export default QuestionBankBrowser;
