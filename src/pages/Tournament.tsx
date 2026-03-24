import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { differenceInSeconds } from "date-fns";
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Clock, Shield, Users } from "lucide-react";

const Tournament = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const [started, setStarted] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
      if (t) setTournament(t);

      const { data: tq } = await supabase
        .from("tournament_questions")
        .select("*, question_bank(*)")
        .eq("tournament_id", id)
        .order("question_order");
      if (tq) {
        const shuffled = [...tq].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      }

      // Participant count
      const { count } = await supabase.from("tournament_participants").select("*", { count: "exact", head: true }).eq("tournament_id", id);
      setParticipantCount(count || 0);

      // Auto-register participant
      if (user) {
        await supabase.from("tournament_participants").upsert({ tournament_id: id, user_id: user.id }, { onConflict: "tournament_id,user_id" });

        const { data: subs } = await supabase
          .from("submissions")
          .select("question_id, submitted_answer")
          .eq("tournament_id", id)
          .eq("user_id", user.id);
        if (subs) {
          const existingAnswers: Record<string, string> = {};
          const existingSubmitted = new Set<string>();
          subs.forEach((s: any) => {
            existingAnswers[s.question_id] = s.submitted_answer || "";
            existingSubmitted.add(s.question_id);
          });
          setAnswers(existingAnswers);
          setSubmitted(existingSubmitted);
        }
      }
    };
    fetchData();
  }, [id, user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Anti-cheat: fullscreen
  useEffect(() => {
    if (!started) return;
    const handler = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        const newStrikes = strikes + 1;
        setStrikes(newStrikes);
        if (newStrikes >= 2) {
          handleAutoSubmit();
          setLockedOut(true);
          logPenalty("fullscreen_exit");
          toast.error("Locked out for exiting fullscreen twice.");
        } else {
          setShowWarning(true);
          logPenalty("fullscreen_exit");
        }
      } else {
        setIsFullscreen(true);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [started, strikes]);

  // Anti-cheat: visibility
  useEffect(() => {
    if (!started || !user || !id) return;
    const handler = () => {
      if (document.hidden) logPenalty("tab_switch");
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [started, user, id]);

  // Anti-cheat: keyboard & context menu
  useEffect(() => {
    if (!started) return;
    const block = (e: KeyboardEvent) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I") || (e.ctrlKey && e.key === "u") ||
          (e.ctrlKey && e.key === "c") || (e.ctrlKey && e.key === "v") || (e.ctrlKey && e.key === "a")) {
        e.preventDefault();
      }
    };
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    const blockSel = (e: Event) => e.preventDefault();
    document.addEventListener("keydown", block);
    document.addEventListener("contextmenu", blockCtx);
    document.addEventListener("selectstart", blockSel);
    return () => {
      document.removeEventListener("keydown", block);
      document.removeEventListener("contextmenu", blockCtx);
      document.removeEventListener("selectstart", blockSel);
    };
  }, [started]);

  // Auto-submit at end
  useEffect(() => {
    if (!tournament || !started) return;
    if (differenceInSeconds(new Date(tournament.end_timestamp), now) <= 0) handleAutoSubmit();
  }, [now, tournament, started]);

  const logPenalty = async (type: string) => {
    if (!user || !id) return;
    await supabase.from("penalty_logs").insert({ user_id: user.id, tournament_id: id, penalty_type: type as any });
    await supabase.rpc("update_global_ranks"); // also bump penalty count
  };

  const handleAutoSubmit = async () => {
    if (!user || !id) return;
    for (const q of questions) {
      const qId = q.question_bank.id;
      if (!submitted.has(qId) && answers[qId]) await submitAnswer(qId, answers[qId]);
    }
    setLockedOut(true);
    toast.info("Tournament ended. All answers submitted.");
    setTimeout(() => navigate(`/results/${id}`), 3000);
  };

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setStarted(true);
      startTimeRef.current = new Date();
    } catch { toast.error("Fullscreen is required."); }
  };

  const submitAnswer = async (questionId: string, answer: string) => {
    if (!user || !id) return;
    const timeTaken = differenceInSeconds(new Date(), startTimeRef.current);
    const { error } = await supabase.from("submissions").upsert({
      user_id: user.id, tournament_id: id, question_id: questionId,
      submitted_answer: answer, time_taken_seconds: timeTaken,
    }, { onConflict: "user_id,tournament_id,question_id" });
    if (!error) {
      setSubmitted(prev => new Set([...prev, questionId]));
      toast.success("Answer Recorded.");
    } else toast.error("Failed to submit.");
  };

  const timeRemaining = tournament ? Math.max(0, differenceInSeconds(new Date(tournament.end_timestamp), now)) : 0;
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  if (!tournament) return <div className="container py-16 text-center text-muted-foreground">Loading tournament...</div>;

  if (lockedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md bg-card border-destructive/50">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="font-display text-xl font-bold text-destructive">Locked Out</h2>
            <p className="text-muted-foreground">You have been locked out of this tournament.</p>
            <Button variant="outline" onClick={() => navigate(`/results/${id}`)}>View Results</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-lg bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">{tournament.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{tournament.description}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {participantCount} participants
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Shield className="h-4 w-4 text-gold" />
                <span>Anti-cheat protocols will be activated</span>
              </div>
              <p>• Fullscreen mode required</p>
              <p>• Tab switching will be logged</p>
              <p>• DevTools & copy/paste disabled</p>
              <p>• 2 fullscreen exits = automatic lockout</p>
            </div>
            <div className="text-gold font-mono text-2xl font-bold">
              {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")} remaining
            </div>
            <Button onClick={enterFullscreen} className="bg-gold text-gold-foreground hover:bg-gold/90" size="lg">
              Enter Fullscreen & Begin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx]?.question_bank;

  return (
    <div className="min-h-screen bg-background no-select">
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="bg-card border-destructive/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Warning: Fullscreen Exited
            </DialogTitle>
            <DialogDescription>
              Strike {strikes}/2. One more = automatic lockout.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => { setShowWarning(false); enterFullscreen(); }} className="bg-gold text-gold-foreground">
            Return to Fullscreen
          </Button>
        </DialogContent>
      </Dialog>

      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-display">{tournament.title}</span>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gold" />
          <span className="font-mono text-lg font-bold text-gold">
            {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">{currentIdx + 1} / {questions.length}</span>
      </div>

      <div className="container max-w-3xl py-8">
        {currentQuestion && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Question {currentIdx + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestion.problem_image_url && (
                <div className="rounded-lg overflow-hidden bg-secondary/30 p-4 flex justify-center" onContextMenu={e => e.preventDefault()}>
                  <img src={currentQuestion.problem_image_url} alt="Problem" draggable={false}
                    className="max-w-full max-h-96 object-contain pointer-events-none" style={{ pointerEvents: "none" }} />
                </div>
              )}

              {currentQuestion.answer_type === "multiple_choice" && currentQuestion.multiple_choice_options ? (
                <RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={val => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))}>
                  {(currentQuestion.multiple_choice_options as string[]).map((opt: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2 p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value={opt} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="cursor-pointer flex-1">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Input placeholder="Enter your answer..." value={answers[currentQuestion.id] || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                  className="bg-secondary/30 border-border text-lg" autoComplete="off" />
              )}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button onClick={() => submitAnswer(currentQuestion.id, answers[currentQuestion.id] || "")}
                  disabled={!answers[currentQuestion.id] || submitted.has(currentQuestion.id)}
                  className={submitted.has(currentQuestion.id) ? "bg-muted text-muted-foreground" : "bg-gold text-gold-foreground hover:bg-gold/90"}>
                  {submitted.has(currentQuestion.id) ? <><CheckCircle className="h-4 w-4 mr-1" /> Recorded</> : "Submit Answer"}
                </Button>
                <Button variant="outline" onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {questions.map((q, i) => (
                  <button key={i} onClick={() => setCurrentIdx(i)}
                    className={`h-8 w-8 rounded text-xs font-mono font-bold transition-colors ${
                      i === currentIdx ? "bg-gold text-gold-foreground"
                        : submitted.has(q.question_bank.id) ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}>{i + 1}</button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tournament;
