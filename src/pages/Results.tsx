import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TierBadge } from "@/components/TierBadge";
import { Trophy, Medal, Clock, ArrowLeft, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchResults = async () => {
      // Tournament info
      const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
      if (t) setTournament(t);

      // Questions
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

      // Profiles
      const { data: profiles } = await supabase.from("profiles").select("id, username, elo_rating");

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
          return a.totalTime - b.totalTime; // tiebreak: faster wins
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

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <Trophy className="h-6 w-6 text-gold" />
        <div>
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
            <Medal className="h-5 w-5 text-gold" /> Full Rankings
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any, i: number) => (
                  <TableRow key={r.user_id} className="border-border">
                    <TableCell>
                      <span className={`font-mono font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>
                        #{i + 1}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{r.username}</TableCell>
                    <TableCell><TierBadge elo={r.elo} /></TableCell>
                    <TableCell className="text-center font-mono font-bold text-foreground">{r.correct}/{r.total}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{Math.round(r.totalTime / 60)}m</TableCell>
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
            <CardTitle className="font-display flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" /> Solutions Revealed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((tq: any, i: number) => (
              <div key={tq.id} className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                <p className="font-display text-sm font-semibold text-foreground">Question {i + 1}</p>
                {tq.question_bank.problem_image_url && (
                  <img
                    src={tq.question_bank.problem_image_url}
                    alt={`Question ${i + 1}`}
                    className="max-w-full max-h-64 object-contain rounded"
                  />
                )}
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Correct Answer: {tq.question_bank.correct_answer}
                  </Badge>
                  <Badge variant="outline">Difficulty: {tq.question_bank.difficulty_weight}/10</Badge>
                  <Badge variant="outline">{tq.question_bank.category?.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Results;
