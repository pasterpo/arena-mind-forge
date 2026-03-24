
-- =============================================
-- ALETHEIA ARENA: Complete Database Schema
-- =============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'competitor');
CREATE TYPE public.question_category AS ENUM ('number_theory', 'algebra', 'combinatorics', 'geometry');
CREATE TYPE public.question_visibility AS ENUM ('draft', 'published');
CREATE TYPE public.answer_type AS ENUM ('text', 'multiple_choice');
CREATE TYPE public.tournament_status AS ENUM ('upcoming', 'active', 'completed');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended');
CREATE TYPE public.penalty_type AS ENUM ('fullscreen_exit', 'tab_switch', 'devtools');

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  global_rank INTEGER,
  penalty_strikes INTEGER NOT NULL DEFAULT 0,
  account_status public.account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER_ROLES TABLE (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'competitor',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. QUESTION_BANK TABLE
CREATE TABLE public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  problem_image_url TEXT,
  correct_answer TEXT NOT NULL,
  answer_type public.answer_type NOT NULL DEFAULT 'text',
  multiple_choice_options JSONB,
  difficulty_weight INTEGER NOT NULL DEFAULT 5 CHECK (difficulty_weight >= 1 AND difficulty_weight <= 10),
  category public.question_category NOT NULL DEFAULT 'algebra',
  visibility public.question_visibility NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- 5. TOURNAMENTS TABLE
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ NOT NULL,
  status public.tournament_status NOT NULL DEFAULT 'upcoming',
  time_limit_minutes INTEGER NOT NULL DEFAULT 60,
  allowed_roles TEXT[] DEFAULT ARRAY['competitor', 'moderator', 'admin'],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- 6. TOURNAMENT_QUESTIONS TABLE
CREATE TABLE public.tournament_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tournament_id, question_id)
);
ALTER TABLE public.tournament_questions ENABLE ROW LEVEL SECURITY;

-- 7. SUBMISSIONS TABLE
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  submitted_answer TEXT,
  time_taken_seconds INTEGER,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tournament_id, question_id)
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 8. PENALTY_LOGS TABLE
CREATE TABLE public.penalty_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  penalty_type public.penalty_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.penalty_logs ENABLE ROW LEVEL SECURITY;

-- 9. ELO_HISTORY TABLE (for rating progression chart)
CREATE TABLE public.elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  elo_before INTEGER NOT NULL,
  elo_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION (prevents recursive RLS)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  )
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

-- USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- QUESTION_BANK
CREATE POLICY "Published questions viewable by authenticated" ON public.question_bank FOR SELECT TO authenticated USING (visibility = 'published' OR public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins/mods can insert questions" ON public.question_bank FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins/mods can update questions" ON public.question_bank FOR UPDATE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins/mods can delete questions" ON public.question_bank FOR DELETE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

-- TOURNAMENTS
CREATE POLICY "Anyone authenticated can view tournaments" ON public.tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/mods can insert tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins/mods can update tournaments" ON public.tournaments FOR UPDATE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins/mods can delete tournaments" ON public.tournaments FOR DELETE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

-- TOURNAMENT_QUESTIONS
CREATE POLICY "Authenticated can view tournament questions" ON public.tournament_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/mods can manage tournament questions" ON public.tournament_questions FOR ALL TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

-- SUBMISSIONS (hide is_correct until tournament ends)
CREATE POLICY "Users can view own submissions" ON public.submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all submissions" ON public.submissions FOR SELECT TO authenticated USING (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Users can insert own submissions" ON public.submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own submissions" ON public.submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- PENALTY_LOGS
CREATE POLICY "Users can view own penalties" ON public.penalty_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own penalties" ON public.penalty_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all penalties" ON public.penalty_logs FOR SELECT TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

-- ELO_HISTORY
CREATE POLICY "Users can view own elo history" ON public.elo_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all elo history" ON public.elo_history FOR SELECT TO authenticated USING (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "System can insert elo history" ON public.elo_history FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- =============================================
-- STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('problem_images', 'problem_images', true);

CREATE POLICY "Anyone can view problem images" ON storage.objects FOR SELECT USING (bucket_id = 'problem_images');
CREATE POLICY "Admins/mods can upload problem images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'problem_images' AND public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins/mods can update problem images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'problem_images' AND public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Admins/mods can delete problem images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'problem_images' AND public.is_admin_or_moderator(auth.uid()));

-- =============================================
-- TRIGGERS & FUNCTIONS
-- =============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'competitor');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ELO RATING ENGINE (Database Function)
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_elo_changes(p_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_elo NUMERIC;
  rec RECORD;
  k_factor NUMERIC;
  expected_score NUMERIC;
  actual_score NUMERIC;
  elo_change INTEGER;
  current_elo INTEGER;
  q_count INTEGER;
  correct_count INTEGER;
BEGIN
  -- Get average Elo of tournament participants
  SELECT AVG(p.elo_rating)::NUMERIC INTO avg_elo
  FROM (SELECT DISTINCT user_id FROM submissions WHERE tournament_id = p_tournament_id) s
  JOIN profiles p ON p.id = s.user_id;

  IF avg_elo IS NULL THEN RETURN; END IF;

  -- Process each participant
  FOR rec IN
    SELECT DISTINCT user_id FROM submissions WHERE tournament_id = p_tournament_id
  LOOP
    SELECT elo_rating INTO current_elo FROM profiles WHERE id = rec.user_id;

    -- Calculate per-question Elo changes
    elo_change := 0;
    FOR q_count IN
      SELECT s.question_id, s.is_correct, qb.difficulty_weight
      FROM submissions s
      JOIN question_bank qb ON qb.id = s.question_id
      WHERE s.tournament_id = p_tournament_id AND s.user_id = rec.user_id
    LOOP
      NULL; -- handled below
    END LOOP;

    -- Simplified: aggregate approach
    SELECT COUNT(*) INTO q_count
    FROM submissions WHERE tournament_id = p_tournament_id AND user_id = rec.user_id;

    SELECT COUNT(*) INTO correct_count
    FROM submissions WHERE tournament_id = p_tournament_id AND user_id = rec.user_id AND is_correct = true;

    -- Expected score (logistic curve)
    expected_score := 1.0 / (1.0 + POWER(10, (avg_elo - current_elo) / 400.0));
    actual_score := CASE WHEN q_count > 0 THEN correct_count::NUMERIC / q_count ELSE 0 END;

    -- Weighted K-factor based on average difficulty of problems solved/missed
    SELECT COALESCE(AVG(
      CASE WHEN s.is_correct THEN qb.difficulty_weight * 4
           ELSE qb.difficulty_weight * 2 END
    ), 32) INTO k_factor
    FROM submissions s
    JOIN question_bank qb ON qb.id = s.question_id
    WHERE s.tournament_id = p_tournament_id AND s.user_id = rec.user_id;

    elo_change := ROUND(k_factor * (actual_score - expected_score));

    -- Record history
    INSERT INTO elo_history (user_id, tournament_id, elo_before, elo_after)
    VALUES (rec.user_id, p_tournament_id, current_elo, current_elo + elo_change);

    -- Update profile
    UPDATE profiles SET elo_rating = current_elo + elo_change WHERE id = rec.user_id;
  END LOOP;

  -- Update global ranks
  PERFORM public.update_global_ranks();
END;
$$;

-- Update global ranks function
CREATE OR REPLACE FUNCTION public.update_global_ranks()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET global_rank = ranked.rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY elo_rating DESC) as rank
    FROM profiles WHERE account_status = 'active'
  ) ranked
  WHERE profiles.id = ranked.id;
END;
$$;

-- Auto-grade submissions
CREATE OR REPLACE FUNCTION public.grade_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  correct TEXT;
BEGIN
  SELECT correct_answer INTO correct FROM question_bank WHERE id = NEW.question_id;
  NEW.is_correct := LOWER(TRIM(NEW.submitted_answer)) = LOWER(TRIM(correct));
  RETURN NEW;
END;
$$;

CREATE TRIGGER grade_submission_trigger
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.grade_submission();

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
