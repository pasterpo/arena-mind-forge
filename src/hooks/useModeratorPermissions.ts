import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ModPerms {
  can_create_problems: boolean;
  can_edit_problems: boolean;
  can_delete_problems: boolean;
  can_create_tournaments: boolean;
  can_edit_tournaments: boolean;
  can_manage_users: boolean;
  can_view_discussions: boolean;
  can_moderate_discussions: boolean;
}

const ALL_TRUE: ModPerms = {
  can_create_problems: true, can_edit_problems: true, can_delete_problems: true,
  can_create_tournaments: true, can_edit_tournaments: true, can_manage_users: true,
  can_view_discussions: true, can_moderate_discussions: true,
};

const ALL_FALSE: ModPerms = {
  can_create_problems: false, can_edit_problems: false, can_delete_problems: false,
  can_create_tournaments: false, can_edit_tournaments: false, can_manage_users: false,
  can_view_discussions: false, can_moderate_discussions: false,
};

export const useModeratorPermissions = (): ModPerms & { loaded: boolean } => {
  const { user, isAdmin, isModerator } = useAuth();
  const [perms, setPerms] = useState<ModPerms | null>(null);

  useEffect(() => {
    if (!user || isAdmin || !isModerator) return;
    supabase.from("moderator_permissions").select("*").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setPerms(data as any); else setPerms(ALL_FALSE); });
  }, [user, isAdmin, isModerator]);

  if (isAdmin) return { ...ALL_TRUE, loaded: true };
  if (!isModerator) return { ...ALL_FALSE, loaded: true };
  return perms ? { ...perms, loaded: true } : { ...ALL_FALSE, loaded: false };
};
