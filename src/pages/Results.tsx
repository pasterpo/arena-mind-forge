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
import { format } from "date-fns";

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSolutions, setShowSolutions] = useState(false);
  const [eloChanges, setEloChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    const fetchResults = async () => {
      const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
      if (t) setTournament(t);

      const { data: tqs } = await supabase
        .from("tournament_questions")
        .select("*, question_bank(*)")
        .eq("tournament_id", id)
        .order("question_order");
      if (tqs) setQuestions(tqs);

      // Aggregate submissions per user
      const { data: subs } = await supabase
        .from("submissions")
        .select("user_id, is_correct, question_id, submitted_answer, time_taken_seconds")
        .eq("tournament_id", id);

      const { data: profiles } = await supabase.from("profiles").select("id, username, elo_rating");

      // Elo changes
      const { data: eloHist } = await supabase.from("elo_history").select("*").eq("tournament_id", id);
      if (eloHist) {
        const changes: Record<string, number> = {};
        eloHist.forEach((e: any) => { changes[e.user_id] = e.elo_after - e.elo_before; });
        setEloChanges(changes);
      }

      if (subs && profiles) {
        const userMap: Record<string, any> = {};
        subs.forEach((s: any) => {
          if (!userMap[s.user_id]) {
            const profile = profiles.find((p: any) => p.id === s.user_id);
            userMap[s.user_id] = {
              user_id: s.user_id,
              username: profile?.username || "Anonymous",
              elo: profile?.elo_rating || 1200,
              correct: 0,
              total: 0,
              totalTime: 0,
              answers: {} as Record<string, any>,
            };
          }
          userMap[s.user_id].total++;
          if (s.is_correct) userMap[s.user_id].correct++;
          userMap[s.user_id].totalTime += s.time_taken_seconds || 0;
          userMap[s.user_id].answers[s.question_id] = { answer: s.submitted_answer, correct: s.is_correct };
        });

        const sorted = Object.values(userMap).sort((a: any, b: any) => {
          if (b.correct !== a.correct) return b.correct - a.correct;
          return a.totalTime - b.totalTime;
        });

        setResults(sorted);
      }
      setLoading(false);
    };
    fetchResults();
  }, [id]);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading results...</div>;
  if (!tournament) return <div className="container py-16 text-center text-muted-foreground">Tournament not found.</div>;

  const isCompleted = tournament.status === "completed";
  const myResult = results.find(r => r.user_id === user?.id);
  const myRank = myResult ? results.indexOf(myResult) + 1 : null;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <Trophy className="h-6 w-6 text-gold" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-foreground">{tournament.title}</h1>
          <p className="text-sm text-muted-foreground">{tournament.description}</p>
        </div>
        <Badge className={isCompleted ? "bg-muted text-muted-foreground" : "bg-gold/20 text-gold border-gold/30"}>
          {tournament.status}
        </Badge>
        {tournament.telegram_link && (
          <a href={tournament.telegram_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 ml-auto">
            <ExternalLink className="h-3 w-3" /> Telegram
          </a>
        )}
      </div>

      {/* Your result highlight */}
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

      {/* Podium */}
      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {results.slice(0, 3).map((r: any, i: number) => {
            const medals = ["🥇", "🥈", "🥉"];
            const borderColors = ["border-gold/50", "border-gray-400/50", "border-bronze/50"];
            return (
              <Card key={r.user_id} className={`bg-card ${borderColors[i]} border-2`}>
                <CardContent className="pt-6 text-center space-y-2">
                  <span className="text-4xl">{medals[i]}</span>
                  <p className="font-display text-xl font-bold text-foreground">{r.username}</p>
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

      {/* Full Leaderboard */}
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
                      {r.username} {r.user_id === user?.id && <Badge variant="outline" className="ml-1 text-xs">You</Badge>}
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

      {/* Solutions (only if completed) */}
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
                const myAnswer = myResult?.answers?.[tq.question_bank.id];
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
                      <img
                        src={tq.question_bank.problem_image_url}
                        alt={`Question ${i + 1}`}
                        className="max-w-full max-h-64 object-contain rounded"
                      />
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
