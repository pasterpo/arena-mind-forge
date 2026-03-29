
CREATE OR REPLACE FUNCTION public.calculate_elo_changes(p_tournament_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  elo_gain INTEGER;
  current_elo INTEGER;
  total_change INTEGER;
BEGIN
  -- Process each participant
  FOR rec IN
    SELECT DISTINCT user_id FROM submissions WHERE tournament_id = p_tournament_id
  LOOP
    SELECT elo_rating INTO current_elo FROM profiles WHERE id = rec.user_id;
    total_change := 0;

    -- For each correct answer, add difficulty_weight * 5 to Elo
    -- For incorrect answers, subtract difficulty_weight * 2
    SELECT COALESCE(SUM(
      CASE 
        WHEN s.is_correct = true THEN qb.difficulty_weight * 5
        WHEN s.is_correct = false THEN -(qb.difficulty_weight * 2)
        ELSE 0
      END
    ), 0) INTO total_change
    FROM submissions s
    JOIN question_bank qb ON qb.id = s.question_id
    WHERE s.tournament_id = p_tournament_id AND s.user_id = rec.user_id;

    -- Record history
    INSERT INTO elo_history (user_id, tournament_id, elo_before, elo_after)
    VALUES (rec.user_id, p_tournament_id, current_elo, GREATEST(0, current_elo + total_change));

    -- Update profile (never go below 0)
    UPDATE profiles SET elo_rating = GREATEST(0, current_elo + total_change) WHERE id = rec.user_id;
  END LOOP;

  -- Update global ranks
  PERFORM public.update_global_ranks();
END;
$function$;
