
-- 1. Add tournament_type to tournaments
DO $$ BEGIN
  CREATE TYPE public.tournament_type AS ENUM ('tournament', 'olympiad', 'jee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS tournament_type public.tournament_type NOT NULL DEFAULT 'tournament';

-- 2. Create tournament_participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view participants" ON public.tournament_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can register themselves" ON public.tournament_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage participants" ON public.tournament_participants FOR ALL TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

-- 3. Add unique constraint on submissions for upsert
DO $$ BEGIN
  ALTER TABLE public.submissions ADD CONSTRAINT submissions_user_tournament_question_unique UNIQUE (user_id, tournament_id, question_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Enable realtime for tournament_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
