
-- BUG-01: Function to get tournament results for all users (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_tournament_results(p_tournament_id UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  elo_rating INTEGER,
  correct_count BIGINT,
  total_count BIGINT,
  total_time BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    COALESCE(p.username, 'Anonymous') AS username,
    p.elo_rating,
    COUNT(*) FILTER (WHERE s.is_correct = true) AS correct_count,
    COUNT(*) AS total_count,
    COALESCE(SUM(s.time_taken_seconds), 0) AS total_time
  FROM submissions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.tournament_id = p_tournament_id
  GROUP BY s.user_id, p.username, p.elo_rating
  ORDER BY correct_count DESC, total_time ASC;
$$;

-- BUG-02: Allow everyone to see elo_history for completed tournaments
CREATE POLICY "Anyone can view elo history for completed tournaments"
  ON public.elo_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = elo_history.tournament_id
      AND t.status = 'completed'
    )
  );

-- BUG-03: Auto-complete tournaments function
CREATE OR REPLACE FUNCTION public.auto_complete_tournaments()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_rec RECORD;
BEGIN
  UPDATE tournaments SET status = 'active'
  WHERE status = 'upcoming' AND start_timestamp <= now();

  FOR t_rec IN
    SELECT id FROM tournaments WHERE status = 'active' AND end_timestamp <= now()
  LOOP
    UPDATE tournaments SET status = 'completed' WHERE id = t_rec.id;
    PERFORM calculate_elo_changes(t_rec.id);
  END LOOP;
END;
$$;

-- BUG-08: Trigger to prevent suspended users from submitting
CREATE OR REPLACE FUNCTION public.check_user_not_suspended()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND account_status = 'suspended') THEN
    RAISE EXCEPTION 'Account is suspended';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_not_suspended BEFORE INSERT ON submissions FOR EACH ROW EXECUTE FUNCTION check_user_not_suspended();

-- BUG-10: Secure function to get tournament questions WITHOUT correct answers
CREATE OR REPLACE FUNCTION public.get_tournament_questions(p_tournament_id UUID)
RETURNS TABLE(
  id UUID,
  question_id UUID,
  question_order INTEGER,
  problem_image_url TEXT,
  answer_type TEXT,
  multiple_choice_options JSONB,
  difficulty_weight INTEGER,
  category TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    tq.id, tq.question_id, tq.question_order,
    qb.problem_image_url, qb.answer_type::TEXT, qb.multiple_choice_options,
    qb.difficulty_weight, qb.category::TEXT
  FROM tournament_questions tq
  JOIN question_bank qb ON qb.id = tq.question_id
  WHERE tq.tournament_id = p_tournament_id
  ORDER BY tq.question_order;
$$;

-- DECO-06: Function to get discussion reply counts
CREATE OR REPLACE FUNCTION public.get_discussion_reply_counts()
RETURNS TABLE(discussion_id UUID, reply_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT discussion_id, COUNT(*) FROM discussion_replies GROUP BY discussion_id;
$$;

-- DECO-07: Atomic penalty strike increment
CREATE OR REPLACE FUNCTION public.increment_penalty_strikes(p_user_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE profiles SET penalty_strikes = penalty_strikes + 1 WHERE id = p_user_id;
$$;

-- MISS-01: Category leaderboard
CREATE OR REPLACE FUNCTION public.get_category_leaderboard(p_type tournament_type, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(user_id UUID, username TEXT, elo_rating INTEGER, category_points BIGINT, tournaments_played BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.elo_rating,
    COALESCE(SUM(CASE WHEN s.is_correct THEN qb.difficulty_weight * 5
                      WHEN s.is_correct = false THEN -(qb.difficulty_weight * 2)
                      ELSE 0 END), 0) AS category_points,
    COUNT(DISTINCT s.tournament_id) AS tournaments_played
  FROM profiles p
  JOIN submissions s ON s.user_id = p.id
  JOIN tournaments t ON t.id = s.tournament_id AND t.tournament_type = p_type AND t.status = 'completed'
  JOIN question_bank qb ON qb.id = s.question_id
  GROUP BY p.id, p.username, p.elo_rating
  ORDER BY category_points DESC
  LIMIT p_limit;
$$;

-- MISS-04: Server-side submission validation - tournament must be active
CREATE OR REPLACE FUNCTION public.check_tournament_active_for_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tournaments WHERE id = NEW.tournament_id AND status = 'active') THEN
    RAISE EXCEPTION 'Tournament is not currently active';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_active_tournament BEFORE INSERT OR UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION check_tournament_active_for_submission();

-- MISS-07: Add foreign keys on discussions
ALTER TABLE discussions ADD CONSTRAINT discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE discussion_replies ADD CONSTRAINT discussion_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- MISS-09: App config table for admin emails
CREATE TABLE IF NOT EXISTS public.app_config (key TEXT PRIMARY KEY, value JSONB NOT NULL);
INSERT INTO app_config VALUES ('admin_emails', '["smithsj0709@gmail.com"]') ON CONFLICT DO NOTHING;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can manage config" ON public.app_config FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read config" ON public.app_config FOR SELECT TO authenticated USING (true);

-- FEAT-02: Add solution columns to question_bank
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS solution_image_url TEXT;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS solution_text TEXT;

-- Attach grade_submission trigger (was missing from db-triggers)
DROP TRIGGER IF EXISTS grade_submission_trigger ON submissions;
CREATE TRIGGER grade_submission_trigger BEFORE INSERT OR UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION grade_submission();
