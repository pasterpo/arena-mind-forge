-- Make new-user provisioning resilient to duplicate usernames during OAuth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_username text;
BEGIN
  candidate_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'user'
  );

  -- If already taken, append a deterministic suffix from user id to guarantee uniqueness.
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.username = candidate_username
      AND p.id <> NEW.id
  ) THEN
    candidate_username := candidate_username || '_' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;

  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, candidate_username)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        username = COALESCE(public.profiles.username, EXCLUDED.username),
        updated_at = now();

  -- Default role: competitor
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'competitor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Auto-assign admin role to owner
  IF NEW.email = 'smithsj0709@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;