
-- Update calculate_elo_changes with new penalty formula:
-- Correct: +difficulty_weight * 5
-- Wrong: -(55 - difficulty_weight * 5)  i.e. 1/10 wrong = -50, 2/10 = -45, ..., 10/10 = -5
CREATE OR REPLACE FUNCTION public.calculate_elo_changes(p_tournament_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  current_elo INTEGER;
  total_change INTEGER;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id FROM submissions WHERE tournament_id = p_tournament_id
  LOOP
    SELECT elo_rating INTO current_elo FROM profiles WHERE id = rec.user_id;
    total_change := 0;

    SELECT COALESCE(SUM(
      CASE 
        WHEN s.is_correct = true THEN qb.difficulty_weight * 5
        WHEN s.is_correct = false THEN -(55 - qb.difficulty_weight * 5)
        ELSE 0
      END
    ), 0) INTO total_change
    FROM submissions s
    JOIN question_bank qb ON qb.id = s.question_id
    WHERE s.tournament_id = p_tournament_id AND s.user_id = rec.user_id;

    INSERT INTO elo_history (user_id, tournament_id, elo_before, elo_after)
    VALUES (rec.user_id, p_tournament_id, current_elo, GREATEST(0, current_elo + total_change));

    UPDATE profiles SET elo_rating = GREATEST(0, current_elo + total_change) WHERE id = rec.user_id;
  END LOOP;

  PERFORM public.update_global_ranks();
END;
$function$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_submissions_tournament_user ON public.submissions(tournament_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON public.tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_user ON public.elo_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_elo_rating ON public.profiles(elo_rating DESC);

-- Allow users to delete their own tournament_participants (unregister)
CREATE POLICY "Users can unregister themselves"
  ON public.tournament_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete own discussion replies
CREATE POLICY "Users can delete own replies"
  ON public.discussion_replies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete own discussions
CREATE POLICY "Users can delete own discussions"
  ON public.discussions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
