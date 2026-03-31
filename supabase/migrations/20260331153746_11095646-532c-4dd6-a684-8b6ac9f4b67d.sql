
-- Update auto_complete_tournaments to also auto-submit unanswered questions as wrong
CREATE OR REPLACE FUNCTION public.auto_complete_tournaments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t_rec RECORD;
BEGIN
  -- Start upcoming tournaments whose start time has passed
  UPDATE tournaments SET status = 'active'
  WHERE status = 'upcoming' AND start_timestamp <= now();

  -- End active tournaments whose end time has passed
  FOR t_rec IN
    SELECT id FROM tournaments WHERE status = 'active' AND end_timestamp <= now()
  LOOP
    -- Auto-submit unanswered questions as wrong for all participants
    INSERT INTO submissions (user_id, tournament_id, question_id, submitted_answer, is_correct, time_taken_seconds)
    SELECT tp.user_id, tq.tournament_id, tq.question_id, NULL, FALSE, 0
    FROM tournament_participants tp
    CROSS JOIN tournament_questions tq
    WHERE tp.tournament_id = t_rec.id AND tq.tournament_id = t_rec.id
      AND NOT EXISTS (
        SELECT 1 FROM submissions s 
        WHERE s.user_id = tp.user_id 
          AND s.tournament_id = t_rec.id 
          AND s.question_id = tq.question_id
      )
    ON CONFLICT DO NOTHING;

    UPDATE tournaments SET status = 'completed' WHERE id = t_rec.id;
    PERFORM calculate_elo_changes(t_rec.id);
  END LOOP;
END;
$function$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_submissions_tournament_question ON public.submissions(tournament_id, question_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON public.tournament_participants(tournament_id);
