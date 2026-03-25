import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

export const useTournament = (id: string | undefined, user: User | null) => {
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
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournamentState, setTournamentState] = useState<"loading" | "not_found" | "not_started" | "not_registered" | "ended" | "ready" | "in_progress" | "locked_out">("loading");
  const startTimeRef = useRef<Date>(new Date());
  const autoSubmittedRef = useRef(false);

  // Fetch tournament data
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);

      // Get tournament
      const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
      if (!t) {
        setTournamentState("not_found");
        setLoading(false);
        return;
      }
      setTournament(t);

      // Check tournament time
      const nowTime = new Date();
      const start = new Date(t.start_timestamp);
      const end = new Date(t.end_timestamp);

      if (nowTime < start) {
        setTournamentState("not_started");
        setLoading(false);
        return;
      }
      if (nowTime > end || t.status === "completed") {
        setTournamentState("ended");
        setLoading(false);
        return;
      }

      // Get questions
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
      const { count } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", id);
      setParticipantCount(count || 0);

      // Check registration & existing submissions
      if (user) {
        const { data: reg } = await supabase
          .from("tournament_participants")
          .select("id")
          .eq("tournament_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!reg) {
          // Auto-register on entry
          await supabase.from("tournament_participants").insert({
            tournament_id: id,
            user_id: user.id,
          });
        }
        setIsRegistered(true);

        // Restore existing answers
        const { data: subs } = await supabase
          .from("submissions")
          .select("question_id, submitted_answer")
          .eq("tournament_id", id)
          .eq("user_id", user.id);
        if (subs && subs.length > 0) {
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

      setTournamentState("ready");
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-submit at tournament end
  useEffect(() => {
    if (!tournament || !started || autoSubmittedRef.current) return;
    if (differenceInSeconds(new Date(tournament.end_timestamp), now) <= 0) {
      handleAutoSubmit();
    }
  }, [now, tournament, started]);

  const logPenalty = useCallback(async (type: string) => {
    if (!user || !id) return;
    await supabase.from("penalty_logs").insert({
      user_id: user.id,
      tournament_id: id,
      penalty_type: type as any,
    });
  }, [user, id]);

  const submitAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!user || !id || !answer.trim()) return;
    const timeTaken = differenceInSeconds(new Date(), startTimeRef.current);
    const { error } = await supabase.from("submissions").upsert(
      {
        user_id: user.id,
        tournament_id: id,
        question_id: questionId,
        submitted_answer: answer.trim(),
        time_taken_seconds: timeTaken,
      },
      { onConflict: "user_id,tournament_id,question_id" }
    );
    if (!error) {
      setSubmitted((prev) => new Set([...prev, questionId]));
      toast.success("Answer Recorded.");
    } else {
      toast.error("Failed to submit: " + error.message);
    }
  }, [user, id]);

  const handleAutoSubmit = useCallback(async () => {
    if (!user || !id || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    // Submit any unanswered questions that have answers typed
    for (const q of questions) {
      const qId = q.question_bank.id;
      if (!submitted.has(qId) && answers[qId]?.trim()) {
        await submitAnswer(qId, answers[qId]);
      }
    }
    setLockedOut(true);
    setTournamentState("locked_out");
    toast.info("Tournament ended. All answers submitted.");
    setTimeout(() => navigate(`/results/${id}`), 3000);
  }, [user, id, questions, submitted, answers, submitAnswer, navigate]);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setStarted(true);
      setTournamentState("in_progress");
      startTimeRef.current = new Date();
    } catch {
      toast.error("Fullscreen is required to begin.");
    }
  }, []);

  const handleStrike = useCallback(() => {
    setIsFullscreen(false);
    const newStrikes = strikes + 1;
    setStrikes(newStrikes);
    if (newStrikes >= 2) {
      handleAutoSubmit();
      setLockedOut(true);
      setTournamentState("locked_out");
      logPenalty("fullscreen_exit");
      toast.error("Locked out for exiting fullscreen twice.");
    } else {
      setShowWarning(true);
      logPenalty("fullscreen_exit");
    }
  }, [strikes, handleAutoSubmit, logPenalty]);

  // Time remaining
  const timeRemaining = tournament
    ? Math.max(0, differenceInSeconds(new Date(tournament.end_timestamp), now))
    : 0;
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;

  return {
    tournament, questions, currentIdx, setCurrentIdx,
    answers, setAnswers, submitted, submitAnswer,
    now, isFullscreen, showWarning, setShowWarning,
    strikes, lockedOut, started, participantCount,
    isRegistered, loading, tournamentState,
    hours, minutes, seconds, timeRemaining,
    enterFullscreen, handleStrike, handleAutoSubmit,
    logPenalty,
  };
};
