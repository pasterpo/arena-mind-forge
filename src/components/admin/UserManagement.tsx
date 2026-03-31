import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TierBadge } from "@/components/TierBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { Ban, ShieldCheck, Edit, Settings2, UserCog, ShieldX, Search, User, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

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
  can_create_problems: false, can_edit_problems: false, can_delete_problems: false,
  can_create_tournaments: false, can_edit_tournaments: false, can_manage_users: false,
  can_view_discussions: true, can_moderate_discussions: false,
};

const permLabels: Record<keyof ModPerms, string> = {
  can_create_problems: "Create Problems", can_edit_problems: "Edit Problems",
  can_delete_problems: "Delete Problems", can_create_tournaments: "Create Tournaments",
  can_edit_tournaments: "Edit Tournaments", can_manage_users: "Manage Users",
  can_view_discussions: "View Discussions", can_moderate_discussions: "Moderate Discussions",
};

const UserManagement = () => {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [newElo, setNewElo] = useState("");
  const [permUser, setPermUser] = useState<any>(null);
  const [perms, setPerms] = useState<ModPerms>(defaultPerms);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [eloDialogOpen, setEloDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch profiles and roles separately since there's no FK between them
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("elo_rating", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesRes.data) setUsers(profilesRes.data);

    // Build roles map: { user_id: ["admin", "competitor", ...] }
    const rm: Record<string, string[]> = {};
    if (rolesRes.data) {
      for (const r of rolesRes.data) {
        if (!rm[r.user_id]) rm[r.user_id] = [];
        rm[r.user_id].push(r.role);
      }
    }
    setRolesMap(rm);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleBan = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    setConfirmAction({
      title: currentStatus === "active" ? "Ban User" : "Unban User",
      description: currentStatus === "active"
        ? "This will suspend the user's account. They won't be able to participate in competitions or post discussions."
        : "This will reactivate the user's account.",
      onConfirm: async () => {
        const { error } = await supabase.from("profiles").update({ account_status: newStatus as any }).eq("id", userId);
        if (error) { toast.error("Failed: " + error.message); }
        else { toast.success(`User ${newStatus === "suspended" ? "banned" : "unbanned"} successfully.`); }
        fetchUsers();
        setConfirmAction(null);
      },
    });
  };

  const handleResetPenalties = (userId: string, username: string) => {
    setConfirmAction({
      title: "Reset Penalty Strikes",
      description: `Reset all penalty strikes to 0 for ${username || "this user"}?`,
      onConfirm: async () => {
        const { error } = await supabase.from("profiles").update({ penalty_strikes: 0 }).eq("id", userId);
        if (error) { toast.error("Failed: " + error.message); }
        else { toast.success("Penalty strikes reset to 0."); }
        fetchUsers();
        setConfirmAction(null);
      },
    });
  };

  const handlePromote = async (userId: string, role: "moderator" | "admin") => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
    if (error) {
      if (error.code === "23505") toast.info("User already has this role.");
      else toast.error("Failed: " + error.message);
      return;
    }
    if (role === "moderator") {
      await supabase.from("moderator_permissions" as any).upsert({ user_id: userId, ...defaultPerms } as any, { onConflict: "user_id" } as any);
    }
    toast.success(`User promoted to ${role}!`);
    fetchUsers();
  };

  const handleDemote = (userId: string, role: "moderator" | "admin") => {
    setConfirmAction({
      title: `Remove ${role} role`,
      description: `This will remove the ${role} role from this user.`,
      onConfirm: async () => {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
        if (role === "moderator") {
          await supabase.from("moderator_permissions" as any).delete().eq("user_id", userId);
        }
        toast.success(`${role} role removed.`);
        fetchUsers();
        setConfirmAction(null);
      },
    });
  };

  const handleEloAdjust = async () => {
    if (!editUser || !newElo) return;
    const { error } = await supabase.from("profiles").update({ elo_rating: parseInt(newElo) }).eq("id", editUser.id);
    if (error) { toast.error("Failed: " + error.message); return; }
    await supabase.rpc("update_global_ranks");
    toast.success("Elo adjusted and ranks updated.");
    setEditUser(null);
    setNewElo("");
    setEloDialogOpen(false);
    fetchUsers();
  };

  const openPermissions = async (u: any) => {
    setPermUser(u);
    const { data } = await supabase.from("moderator_permissions" as any).select("*").eq("user_id", u.id).single();
    if (data) setPerms(data as any);
    else setPerms(defaultPerms);
    setPermDialogOpen(true);
  };

  const savePermissions = async () => {
    if (!permUser) return;
    await supabase.from("moderator_permissions" as any).upsert({
      user_id: permUser.id, ...perms,
    } as any, { onConflict: "user_id" } as any);
    toast.success(`Permissions saved for ${permUser.username || "user"}.`);
    setPermDialogOpen(false);
    fetchUsers();
  };

  const filteredUsers = users.filter(u =>
    !search || (u.username || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
        </div>
        <span className="text-sm text-muted-foreground">Showing {filteredUsers.length} of {users.length} users</span>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
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
            {filteredUsers.map(u => {
              const roles = rolesMap[u.id] || [];
              const isMod = roles.includes("moderator");
              const isAdminUser = roles.includes("admin");
              return (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium">{u.username || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email || "—"}</TableCell>
                  <TableCell>
                    {roles.length === 0 || (roles.length === 1 && roles[0] === "competitor") ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">competitor</Badge>
                    ) : (
                      roles.filter(r => r !== "competitor").map((r: string) => (
                        <Badge key={r} variant="outline" className={`mr-1 text-xs ${r === "admin" ? "border-gold/50 text-gold" : r === "moderator" ? "border-blue-400/50 text-blue-400" : ""}`}>
                          {r}
                        </Badge>
                      ))
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-bold">{u.elo_rating}</TableCell>
                  <TableCell><TierBadge elo={u.elo_rating} /></TableCell>
                  <TableCell>
                    <Badge className={u.account_status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                      {u.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono ${u.penalty_strikes > 0 ? "text-destructive font-bold" : ""}`}>
                      {u.penalty_strikes}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {/* Ban / Unban */}
                      <Button variant="ghost" size="icon" onClick={() => handleBan(u.id, u.account_status)}
                        title={u.account_status === "active" ? "Ban User" : "Unban User"}>
                        <Ban className={`h-4 w-4 ${u.account_status === "suspended" ? "text-destructive" : "text-muted-foreground"}`} />
                      </Button>

                      {/* Reset Penalties */}
                      {u.penalty_strikes > 0 && (
                        <Button variant="ghost" size="icon" onClick={() => handleResetPenalties(u.id, u.username)} title="Reset Penalties">
                          <RotateCcw className="h-4 w-4 text-amber-400" />
                        </Button>
                      )}

                      {/* Promote (only for users without admin/mod role) */}
                      {isAdmin && !isAdminUser && !isMod && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Promote"><ShieldCheck className="h-4 w-4 text-gold" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handlePromote(u.id, "moderator")}>Promote to Moderator</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePromote(u.id, "admin")}>Promote to Admin</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Moderator: edit permissions + demote */}
                      {isAdmin && isMod && !isAdminUser && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openPermissions(u)} title="Edit Permissions">
                            <Settings2 className="h-4 w-4 text-blue-400" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDemote(u.id, "moderator")} title="Demote from Moderator">
                            <ShieldX className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}

                      {/* Remove admin (not yourself) */}
                      {isAdmin && isAdminUser && u.id !== user?.id && (
                        <Button variant="ghost" size="icon" onClick={() => handleDemote(u.id, "admin")} title="Remove Admin Role">
                          <ShieldX className="h-4 w-4 text-destructive" />
                        </Button>
                      )}

                      {/* Adjust Elo */}
                      <Button variant="ghost" size="icon" onClick={() => { setEditUser(u); setNewElo(String(u.elo_rating)); setEloDialogOpen(true); }} title="Adjust Elo">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>

                      {/* View Profile */}
                      <Link to={`/profile/${u.id}`}>
                        <Button variant="ghost" size="icon" title="View Profile">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Elo Adjust Dialog */}
      <Dialog open={eloDialogOpen} onOpenChange={setEloDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Adjust Elo for {editUser?.username || "user"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Elo: <span className="font-mono font-bold">{editUser?.elo_rating}</span></Label>
              <Label>New Elo Rating</Label>
              <Input type="number" value={newElo} onChange={e => setNewElo(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleEloAdjust} className="bg-gold text-gold-foreground hover:bg-gold/90">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-400" /> Permissions — {permUser?.username || "user"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Toggle specific rights for this moderator.</p>
            {(Object.keys(permLabels) as (keyof ModPerms)[]).map(key => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <Label className="text-sm">{permLabels[key]}</Label>
                <Switch checked={perms[key]} onCheckedChange={(v) => setPerms(prev => ({ ...prev, [key]: v }))} />
              </div>
            ))}
            <Button onClick={savePermissions} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">Save Permissions</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.title || ""}
        description={confirmAction?.description || ""}
        onConfirm={confirmAction?.onConfirm || (() => {})}
      />
    </div>
  );
};

export default UserManagement;
