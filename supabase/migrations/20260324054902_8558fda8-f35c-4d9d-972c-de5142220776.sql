
-- Add telegram_link to tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS telegram_link text;

-- Create moderator_permissions table for granular rights
CREATE TABLE public.moderator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_create_problems boolean NOT NULL DEFAULT false,
  can_edit_problems boolean NOT NULL DEFAULT false,
  can_delete_problems boolean NOT NULL DEFAULT false,
  can_create_tournaments boolean NOT NULL DEFAULT false,
  can_edit_tournaments boolean NOT NULL DEFAULT false,
  can_manage_users boolean NOT NULL DEFAULT false,
  can_view_discussions boolean NOT NULL DEFAULT true,
  can_moderate_discussions boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions"
  ON public.moderator_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own permissions"
  ON public.moderator_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create discussions table
CREATE TABLE public.discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view discussions"
  ON public.discussions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create discussions"
  ON public.discussions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins/mods can manage discussions"
  ON public.discussions FOR ALL
  TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can update own discussions"
  ON public.discussions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create discussion_replies table
CREATE TABLE public.discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view replies"
  ON public.discussion_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create replies"
  ON public.discussion_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins/mods can manage replies"
  ON public.discussion_replies FOR ALL
  TO authenticated
  USING (is_admin_or_moderator(auth.uid()));

-- Enable realtime for discussions
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;

-- Create updated_at trigger for moderator_permissions
CREATE TRIGGER update_moderator_permissions_updated_at
  BEFORE UPDATE ON public.moderator_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for discussions
CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
