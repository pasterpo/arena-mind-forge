import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/TierBadge";
import { Trophy, Medal, Clock, ArrowLeft, CheckCircle, XCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIST } from "@/lib/dateUtils";

const typeColor: Record<string, string> = {
  tournament: "bg-gold/20 text-gold border-gold/30",
  olympiad: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  jee: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};
const typeLabel: Record<string, string> = { tournament: "Tournament", olympiad: "Olympiad", jee: "JEE Mock" };

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSolutions, setShowSolutions] = useState(false);
  const [eloChanges, setEloChanges] = useState<Record<string, number>>({});
  const [myAnswers, setMyAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!id) return;
    const fetchResults = async () => {
      // Fire-and-forget auto-complete
      try { supabase.rpc("auto_complete_tournaments").then(() => {}); } catch (_) {}

      const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
      if (t) setTournament(t);

      const { data: tqs } = await supabase
        .from("tournament_questions")
        .select("*, question_bank(*)")
        .eq("tournament_id", id)
        .order("question_order");
      if (tqs) setQuestions(tqs);

      const { data: tournamentResults } = await supabase.rpc("get_tournament_results", {
        p_tournament_id: id,
      });
      if (tournamentResults) {
        setResults(tournamentResults.map((r: any) => ({
          user_id: r.user_id,
          username: r.username,
          elo: r.elo_rating,
          correct: Number(r.correct_count),
          total: Number(r.total_count),
          totalTime: Number(r.total_time),
        })));
      }

      if (user) {
        const { data: mySubs } = await supabase
          .from("submissions")
          .select("question_id, submitted_answer, is_correct")
          .eq("tournament_id", id)
          .eq("user_id", user.id);
        if (mySubs) {
          const answers: Record<string, any> = {};
          mySubs.forEach((s: any) => {
            answers[s.question_id] = { answer: s.submitted_answer, correct: s.is_correct };
          });
          setMyAnswers(answers);
        }
      }

      const { data: eloHist } = await supabase.from("elo_history").select("*").eq("tournament_id", id);
      if (eloHist) {
        const changes: Record<string, number> = {};
        eloHist.forEach((e: any) => { changes[e.user_id] = e.elo_after - e.elo_before; });
        setEloChanges(changes);
      }

      setLoading(false);
    };
    fetchResults();
  }, [id, user]);

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!tournament) return <div className="container py-16 text-center text-muted-foreground">Tournament not found.</div>;

  const isCompleted = tournament.status === "completed";
  const myResult = results.find(r => r.user_id === user?.id);
  const myRank = myResult ? results.indexOf(myResult) + 1 : null;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/past">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <Trophy className="h-6 w-6 text-gold" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-foreground">{tournament.title}</h1>
          <p className="text-sm text-muted-foreground">{tournament.description}</p>
        </div>
        <Badge className={typeColor[tournament.tournament_type] || typeColor.tournament}>
          {typeLabel[tournament.tournament_type] || "Tournament"}
        </Badge>
        <Badge className={isCompleted ? "bg-muted text-muted-foreground" : "bg-gold/20 text-gold border-gold/30"}>
          {tournament.status}
        </Badge>
        {tournament.telegram_link && (
          <a href={tournament.telegram_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 ml-auto">
            <ExternalLink className="h-3 w-3" /> Telegram
          </a>
        )}
      </div>

      {myResult && (
        <Card className="bg-card border-gold/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Your Performance</p>
              <p className="text-2xl font-bold font-mono text-gold">{myResult.correct}/{myResult.total} correct</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Rank #{myRank}</p>
              {eloChanges[user?.id || ""] !== undefined && (
                <p className={`text-lg font-mono font-bold ${eloChanges[user?.id || ""] >= 0 ? "text-green-400" : "text-destructive"}`}>
                  {eloChanges[user?.id || ""] >= 0 ? "+" : ""}{eloChanges[user?.id || ""]} Elo
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {results.slice(0, 3).map((r: any, i: number) => {
            const medals = ["🥇", "🥈", "🥉"];
            const borderColors = ["border-gold/50", "border-gray-400/50", "border-amber-700/50"];
            return (
              <Card key={r.user_id} className={`bg-card ${borderColors[i]} border-2`}>
                <CardContent className="pt-6 text-center space-y-2">
                  <span className="text-4xl">{medals[i]}</span>
                  <p className="font-display text-xl font-bold text-foreground">
                    <Link to={`/profile/${r.user_id}`} className="hover:text-gold transition-colors">{r.username || "Anonymous"}</Link>
                  </p>
                  <TierBadge elo={r.elo} />
                  <p className="text-2xl font-mono font-bold text-gold">{r.correct}/{r.total}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" /> {Math.round(r.totalTime / 60)} min
                  </p>
                  {eloChanges[r.user_id] !== undefined && (
                    <p className={`text-sm font-mono font-bold ${eloChanges[r.user_id] >= 0 ? "text-green-400" : "text-destructive"}`}>
                      {eloChanges[r.user_id] >= 0 ? "+" : ""}{eloChanges[r.user_id]} Elo
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Medal className="h-5 w-5 text-gold" /> Full Rankings ({results.length} participants)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Time</TableHead>
                  <TableHead className="text-center">Elo Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any, i: number) => (
                  <TableRow key={r.user_id} className={`border-border ${r.user_id === user?.id ? "bg-gold/5" : ""}`}>
                    <TableCell>
                      <span className={`font-mono font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>
                        #{i + 1}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link to={`/profile/${r.user_id}`} className="hover:text-gold transition-colors">
                        {r.username || "Anonymous"}
                      </Link>
                      {r.user_id === user?.id && <Badge variant="outline" className="ml-1 text-xs">You</Badge>}
                    </TableCell>
                    <TableCell><TierBadge elo={r.elo} /></TableCell>
                    <TableCell className="text-center font-mono font-bold text-foreground">{r.correct}/{r.total}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{Math.round(r.totalTime / 60)}m</TableCell>
                    <TableCell className="text-center">
                      {eloChanges[r.user_id] !== undefined ? (
                        <span className={`font-mono font-bold ${eloChanges[r.user_id] >= 0 ? "text-green-400" : "text-destructive"}`}>
                          {eloChanges[r.user_id] >= 0 ? "+" : ""}{eloChanges[r.user_id]}
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isCompleted && questions.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" /> Solutions
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowSolutions(!showSolutions)}>
                {showSolutions ? <><EyeOff className="h-4 w-4 mr-1" /> Hide</> : <><Eye className="h-4 w-4 mr-1" /> Reveal Solutions</>}
              </Button>
            </div>
          </CardHeader>
          {showSolutions && (
            <CardContent className="space-y-4">
              {questions.map((tq: any, i: number) => {
                const myAnswer = myAnswers[tq.question_bank.id];
                return (
                  <div key={tq.id} className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-sm font-semibold text-foreground">Question {i + 1}</p>
                      {myAnswer && (
                        <Badge className={myAnswer.correct ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}>
                          {myAnswer.correct ? <><CheckCircle className="h-3 w-3 mr-1" /> Correct</> : <><XCircle className="h-3 w-3 mr-1" /> Wrong</>}
                        </Badge>
                      )}
                    </div>
                    {tq.question_bank.problem_image_url && (
                      <img src={tq.question_bank.problem_image_url} alt={`Question ${i + 1}`} className="max-w-full max-h-64 object-contain rounded" />
                    )}
                    {tq.question_bank.solution_image_url && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground mb-2">Solution:</p>
                        <img src={tq.question_bank.solution_image_url} alt={`Solution ${i + 1}`} className="max-w-full max-h-64 object-contain rounded" />
                      </div>
                    )}
                    {tq.question_bank.solution_text && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground mb-1">Explanation:</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{tq.question_bank.solution_text}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Answer: {tq.question_bank.correct_answer}
                      </Badge>
                      {myAnswer && !myAnswer.correct && (
                        <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                          Your answer: {myAnswer.answer}
                        </Badge>
                      )}
                      <Badge variant="outline">Difficulty: {tq.question_bank.difficulty_weight}/10</Badge>
                      <Badge variant="outline">{tq.question_bank.category?.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="text-xs">
                        ✅ +{tq.question_bank.difficulty_weight * 5} | ❌ -{55 - tq.question_bank.difficulty_weight * 5}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default Results;
