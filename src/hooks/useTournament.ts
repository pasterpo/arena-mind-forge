import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const seededShuffle = <T,>(arr: T[], seed: string): T[] => {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

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
  const [tournamentState, setTournamentState] = useState<"loading" | "not_found" | "not_started" | "ended" | "ready" | "in_progress" | "locked_out">("loading");
  const startTimeRef = useRef<Date>(new Date());
  const autoSubmittedRef = useRef(false);
  const questionsRef = useRef<any[]>([]);
  const submittedRef = useRef<Set<string>>(new Set());
  const answersRef = useRef<Record<string, string>>({});
  const strikesRef = useRef(0);

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { strikesRef.current = strikes; }, [strikes]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);

      const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).single();
      if (!t) {
        setTournamentState("not_found");
        setLoading(false);
        return;
      }
      setTournament(t);

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

      // BUG-10 FIX: Use RPC to get questions WITHOUT correct answers
      const { data: tqData } = await supabase.rpc("get_tournament_questions", {
        p_tournament_id: id,
      });
      if (tqData) {
        // Transform to match expected structure
        const formattedQuestions = (tqData as any[]).map((q: any) => ({
          id: q.id,
          question_bank: {
            id: q.question_id,
            problem_image_url: q.problem_image_url,
            answer_type: q.answer_type,
            multiple_choice_options: q.multiple_choice_options,
            difficulty_weight: q.difficulty_weight,
            category: q.category,
          },
        }));
        const seed = user ? `${user.id}-${id}` : id;
        const shuffled = seededShuffle(formattedQuestions, seed);
        setQuestions(shuffled);
      }

      const { count } = await supabase
        .from("tournament_participants")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", id);
      setParticipantCount(count || 0);

      if (user) {
        const { data: reg } = await supabase
          .from("tournament_participants")
          .select("id")
          .eq("tournament_id", id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!reg) {
          await supabase.from("tournament_participants").insert({
            tournament_id: id,
            user_id: user.id,
          });
        }
        setIsRegistered(true);

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

        const { count: penaltyCount } = await supabase
          .from("penalty_logs")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", id)
          .eq("user_id", user.id)
          .eq("penalty_type", "fullscreen_exit");
        if (penaltyCount && penaltyCount >= 2) {
          setLockedOut(true);
          setTournamentState("locked_out");
          setLoading(false);
          return;
        }
        setStrikes(penaltyCount || 0);
      }

      setTournamentState("ready");
      setLoading(false);
    };
    fetchData();
  }, [id, user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // DECO-07 FIX: Atomic penalty increment
  const logPenalty = useCallback(async (type: string) => {
    if (!user || !id) return;
    await supabase.from("penalty_logs").insert({
      user_id: user.id,
      tournament_id: id,
      penalty_type: type as any,
    });
    if (type === "tab_switch") {
      await supabase.rpc("increment_penalty_strikes", { p_user_id: user.id });
    }
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
    const qs = questionsRef.current;
    const sub = submittedRef.current;
    const ans = answersRef.current;
    for (const q of qs) {
      const qId = q.question_bank.id;
      if (!sub.has(qId) && ans[qId]?.trim()) {
        const timeTaken = differenceInSeconds(new Date(), startTimeRef.current);
        await supabase.from("submissions").upsert(
          {
            user_id: user.id,
            tournament_id: id,
            question_id: qId,
            submitted_answer: ans[qId].trim(),
            time_taken_seconds: timeTaken,
          },
          { onConflict: "user_id,tournament_id,question_id" }
        );
      }
    }
    // BUG-03 FALLBACK: Try auto-completing tournaments
    await supabase.rpc("auto_complete_tournaments").catch(() => {});
    setLockedOut(true);
    setTournamentState("locked_out");
    toast.info("Tournament ended. All answers submitted.");
    setTimeout(() => navigate(`/results/${id}`), 3000);
  }, [user, id, navigate]);

  useEffect(() => {
    if (!tournament || !started || autoSubmittedRef.current) return;
    if (differenceInSeconds(new Date(tournament.end_timestamp), now) <= 0) {
      handleAutoSubmit();
    }
  }, [now, tournament, started, handleAutoSubmit]);

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

  // DECO-08 FIX: Use ref for strikes to avoid closure bug
  const handleStrike = useCallback(() => {
    setIsFullscreen(false);
    const newStrikes = strikesRef.current + 1;
    setStrikes(newStrikes);
    logPenalty("fullscreen_exit");
    if (newStrikes >= 2) {
      handleAutoSubmit();
      setLockedOut(true);
      setTournamentState("locked_out");
      toast.error("Locked out for exiting fullscreen twice.");
    } else {
      setShowWarning(true);
    }
  }, [handleAutoSubmit, logPenalty]);

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
