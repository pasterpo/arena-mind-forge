import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/hooks/useTournament";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Clock, Shield, Users, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

const Tournament = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useTournament(id, user);

  // Anti-cheat: fullscreen exit detection
  useEffect(() => {
    if (!t.started) return;
    const handler = () => {
      if (!document.fullscreenElement) t.handleStrike();
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [t.started, t.handleStrike]);

  // Anti-cheat: tab switch
  useEffect(() => {
    if (!t.started || !user || !id) return;
    const handler = () => {
      if (document.hidden) t.logPenalty("tab_switch");
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [t.started, user, id, t.logPenalty]);

  // Anti-cheat: keyboard & context menu
  useEffect(() => {
    if (!t.started) return;
    const block = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "c") ||
        (e.ctrlKey && e.key === "v") ||
        (e.ctrlKey && e.key === "a")
      ) {
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
  }, [t.started]);

  // States: loading, not found, not started, ended, locked out
  if (t.loading) {
    return (
      <div className="container py-16 text-center text-muted-foreground">
        Loading tournament...
      </div>
    );
  }

  if (t.tournamentState === "not_found") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md bg-card border-border">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="font-display text-xl font-bold">Tournament Not Found</h2>
            <p className="text-muted-foreground">This tournament doesn't exist or has been removed.</p>
            <Link to="/"><Button variant="outline">Back to Arena</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (t.tournamentState === "not_started") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md bg-card border-border">
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="h-12 w-12 mx-auto text-gold" />
            <h2 className="font-display text-xl font-bold">{t.tournament?.title}</h2>
            <p className="text-muted-foreground">This tournament hasn't started yet.</p>
            <p className="text-gold font-mono text-lg">
              Starts: {t.tournament && format(new Date(t.tournament.start_timestamp), "MMM d, yyyy HH:mm")} UTC
            </p>
            <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Arena</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (t.tournamentState === "ended") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md bg-card border-border">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-400" />
            <h2 className="font-display text-xl font-bold">{t.tournament?.title}</h2>
            <p className="text-muted-foreground">This tournament has ended.</p>
            <Button onClick={() => navigate(`/results/${id}`)} className="bg-gold text-gold-foreground hover:bg-gold/90">
              View Results
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (t.lockedOut || t.tournamentState === "locked_out") {
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

  // Pre-start screen
  if (!t.started) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-lg bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">{t.tournament?.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t.tournament?.description}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {t.participantCount} participants
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
            <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-1">
              <p className="text-xs text-muted-foreground">Questions: {t.questions.length}</p>
              <p className="text-xs text-muted-foreground">Time Limit: {t.tournament?.time_limit_minutes} minutes</p>
            </div>
            <div className="text-gold font-mono text-2xl font-bold">
              {t.hours.toString().padStart(2, "0")}:{t.minutes.toString().padStart(2, "0")}:{t.seconds.toString().padStart(2, "0")} remaining
            </div>
            {t.questions.length === 0 ? (
              <div className="text-destructive text-sm">No questions assigned to this tournament yet.</div>
            ) : (
              <Button onClick={t.enterFullscreen} className="bg-gold text-gold-foreground hover:bg-gold/90" size="lg">
                Enter Fullscreen & Begin
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // In-tournament UI
  const currentQuestion = t.questions[t.currentIdx]?.question_bank;
  const progress = t.submitted.size;
  const total = t.questions.length;

  return (
    <div className="min-h-screen bg-background no-select">
      {/* Warning Dialog */}
      <Dialog open={t.showWarning} onOpenChange={t.setShowWarning}>
        <DialogContent className="bg-card border-destructive/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Warning: Fullscreen Exited
            </DialogTitle>
            <DialogDescription>
              Strike {t.strikes}/2. One more = automatic lockout & submission.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              t.setShowWarning(false);
              t.enterFullscreen();
            }}
            className="bg-gold text-gold-foreground"
          >
            Return to Fullscreen
          </Button>
        </DialogContent>
      </Dialog>

      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-display">{t.tournament?.title}</span>
        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground">
            {progress}/{total} answered
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gold" />
            <span className={`font-mono text-lg font-bold ${t.timeRemaining < 300 ? "text-destructive animate-pulse" : "text-gold"}`}>
              {t.hours.toString().padStart(2, "0")}:{t.minutes.toString().padStart(2, "0")}:{t.seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{t.currentIdx + 1} / {total}</span>
      </div>

      {/* Question Area */}
      <div className="container max-w-3xl py-8">
        {currentQuestion ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Question {t.currentIdx + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem Image */}
              {currentQuestion.problem_image_url && (
                <div
                  className="rounded-lg overflow-hidden bg-secondary/30 p-4 flex justify-center"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img
                    src={currentQuestion.problem_image_url}
                    alt="Problem"
                    draggable={false}
                    className="max-w-full max-h-96 object-contain pointer-events-none select-none"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  />
                </div>
              )}

              {/* Answer Input */}
              {currentQuestion.answer_type === "multiple_choice" && currentQuestion.multiple_choice_options ? (
                <RadioGroup
                  value={t.answers[currentQuestion.id] || ""}
                  onValueChange={(val) =>
                    t.setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))
                  }
                  disabled={t.submitted.has(currentQuestion.id)}
                >
                  {(currentQuestion.multiple_choice_options as string[]).map((opt: string, i: number) => (
                    <div
                      key={i}
                      className={`flex items-center space-x-2 p-3 rounded-md transition-colors ${
                        t.submitted.has(currentQuestion.id)
                          ? "bg-secondary/20 opacity-60"
                          : "bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <RadioGroupItem value={opt} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="cursor-pointer flex-1">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Input
                  placeholder="Enter your answer..."
                  value={t.answers[currentQuestion.id] || ""}
                  onChange={(e) =>
                    t.setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                  }
                  disabled={t.submitted.has(currentQuestion.id)}
                  className="bg-secondary/30 border-border text-lg"
                  autoComplete="off"
                />
              )}

              {/* Navigation & Submit */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => t.setCurrentIdx(Math.max(0, t.currentIdx - 1))}
                  disabled={t.currentIdx === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                <Button
                  onClick={() => t.submitAnswer(currentQuestion.id, t.answers[currentQuestion.id] || "")}
                  disabled={!t.answers[currentQuestion.id]?.trim() || t.submitted.has(currentQuestion.id)}
                  className={
                    t.submitted.has(currentQuestion.id)
                      ? "bg-muted text-muted-foreground"
                      : "bg-gold text-gold-foreground hover:bg-gold/90"
                  }
                >
                  {t.submitted.has(currentQuestion.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" /> Recorded
                    </>
                  ) : (
                    "Submit Answer"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => t.setCurrentIdx(Math.min(total - 1, t.currentIdx + 1))}
                  disabled={t.currentIdx === total - 1}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Question Navigator */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {t.questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => t.setCurrentIdx(i)}
                    className={`h-8 w-8 rounded text-xs font-mono font-bold transition-colors ${
                      i === t.currentIdx
                        ? "bg-gold text-gold-foreground"
                        : t.submitted.has(q.question_bank.id)
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : t.answers[q.question_bank.id]?.trim()
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Submit All Button */}
              {progress < total && (
                <div className="pt-2 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => {
                      if (window.confirm(`Submit all ${progress} answered questions and finish?`)) {
                        t.handleAutoSubmit();
                      }
                    }}
                  >
                    Finish & Submit All ({progress}/{total})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              No questions available.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tournament;
