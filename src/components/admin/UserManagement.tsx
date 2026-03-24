import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TierBadge } from "@/components/TierBadge";
import { toast } from "sonner";
import { Ban, ShieldCheck, Edit, Settings2, UserCog, ShieldX } from "lucide-react";

interface ModPerms {
  can_create_problems: boolean;
  can_edit_problems: boolean;
  can_delete_problems: boolean;
  can_create_tournaments: boolean;
  can_edit_tournaments: boolean;
  can_manage_users: boolean;
  can_view_discussions: boolean;
  can_moderate_discussions: boolean;
}

const defaultPerms: ModPerms = {
  can_create_problems: false,
  can_edit_problems: false,
  can_delete_problems: false,
  can_create_tournaments: false,
  can_edit_tournaments: false,
  can_manage_users: false,
  can_view_discussions: true,
  can_moderate_discussions: false,
};

const permLabels: Record<keyof ModPerms, string> = {
  can_create_problems: "Create Problems",
  can_edit_problems: "Edit Problems",
  can_delete_problems: "Delete Problems",
  can_create_tournaments: "Create Tournaments",
  can_edit_tournaments: "Edit Tournaments",
  can_manage_users: "Manage Users",
  can_view_discussions: "View Discussions",
  can_moderate_discussions: "Moderate Discussions",
};

const UserManagement = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [editUser, setEditUser] = useState<any>(null);
  const [newElo, setNewElo] = useState("");
  const [permUser, setPermUser] = useState<any>(null);
  const [perms, setPerms] = useState<ModPerms>(defaultPerms);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [eloDialogOpen, setEloDialogOpen] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("elo_rating", { ascending: false });
    if (data) setUsers(data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    await supabase.from("profiles").update({ account_status: newStatus as any }).eq("id", userId);
    toast.success(`User ${newStatus === "suspended" ? "banned" : "unbanned"}.`);
    fetchUsers();
  };

  const handlePromote = async (userId: string) => {
    await supabase.from("user_roles").insert({ user_id: userId, role: "moderator" as any });
    // Create default permissions
    await supabase.from("moderator_permissions" as any).upsert({
      user_id: userId,
      ...defaultPerms,
    } as any);
    toast.success("User promoted to moderator with default permissions.");
    fetchUsers();
  };

  const handleDemote = async (userId: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "moderator" as any);
    await supabase.from("moderator_permissions" as any).delete().eq("user_id", userId);
    toast.success("Moderator demoted to competitor.");
    fetchUsers();
  };

  const handleEloAdjust = async () => {
    if (!editUser || !newElo) return;
    await supabase.from("profiles").update({ elo_rating: parseInt(newElo) }).eq("id", editUser.id);
    toast.success("Elo adjusted.");
    setEditUser(null);
    setNewElo("");
    setEloDialogOpen(false);
    fetchUsers();
  };

  const openPermissions = async (user: any) => {
    setPermUser(user);
    const { data } = await supabase.from("moderator_permissions" as any).select("*").eq("user_id", user.id).single();
    if (data) {
      setPerms(data as any);
    } else {
      setPerms(defaultPerms);
    }
    setPermDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!permUser) return;
    const { can_create_problems, can_edit_problems, can_delete_problems, can_create_tournaments, can_edit_tournaments, can_manage_users, can_view_discussions, can_moderate_discussions } = perms;
    await supabase.from("moderator_permissions" as any).upsert({
      user_id: permUser.id,
      can_create_problems,
      can_edit_problems,
      can_delete_problems,
      can_create_tournaments,
      can_edit_tournaments,
      can_manage_users,
      can_view_discussions,
      can_moderate_discussions,
    } as any);
    toast.success("Permissions updated.");
    setPermDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Elo</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Strikes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => {
              const roles = (u.user_roles || []).map((r: any) => r.role);
              const isMod = roles.includes("moderator");
              const isAdminUser = roles.includes("admin");
              return (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium">{u.username || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    {roles.map((r: string) => (
                      <Badge key={r} variant="outline" className={`mr-1 text-xs ${r === "admin" ? "border-gold/50 text-gold" : r === "moderator" ? "border-blue-400/50 text-blue-400" : ""}`}>
                        {r}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="font-mono font-bold">{u.elo_rating}</TableCell>
                  <TableCell><TierBadge elo={u.elo_rating} /></TableCell>
                  <TableCell>
                    <Badge className={u.account_status === "active" ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}>
                      {u.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{u.penalty_strikes}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBan(u.id, u.account_status)}
                        title={u.account_status === "active" ? "Ban" : "Unban"}
                      >
                        <Ban className={`h-4 w-4 ${u.account_status === "active" ? "text-muted-foreground" : "text-destructive"}`} />
                      </Button>

                      {/* Promote / Demote */}
                      {isAdmin && !isAdminUser && (
                        isMod ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openPermissions(u)} title="Edit Permissions">
                              <Settings2 className="h-4 w-4 text-blue-400" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDemote(u.id)} title="Demote to Competitor">
                              <ShieldX className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => handlePromote(u.id)} title="Promote to Moderator">
                            <ShieldCheck className="h-4 w-4 text-gold" />
                          </Button>
                        )
                      )}

                      {/* Elo Adjust */}
                      <Button variant="ghost" size="icon" onClick={() => { setEditUser(u); setNewElo(String(u.elo_rating)); setEloDialogOpen(true); }}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Elo Adjust Dialog */}
      <Dialog open={eloDialogOpen} onOpenChange={setEloDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Adjust Elo for {editUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Elo Rating</Label>
              <Input type="number" value={newElo} onChange={e => setNewElo(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleEloAdjust} className="bg-gold text-gold-foreground">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-400" />
              Permissions — {permUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Toggle specific rights for this moderator. Only admins can change these.</p>
            {(Object.keys(permLabels) as (keyof ModPerms)[]).map(key => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <Label className="text-sm">{permLabels[key]}</Label>
                <Switch
                  checked={perms[key]}
                  onCheckedChange={(v) => setPerms(prev => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
            <Button onClick={savePermissions} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
              Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
