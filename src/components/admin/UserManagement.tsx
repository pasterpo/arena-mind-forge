import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TierBadge } from "@/components/TierBadge";
import { toast } from "sonner";
import { Ban, ShieldCheck, Edit } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [editUser, setEditUser] = useState<any>(null);
  const [newElo, setNewElo] = useState("");

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
    toast.success("User promoted to moderator.");
    fetchUsers();
  };

  const handleEloAdjust = async () => {
    if (!editUser || !newElo) return;
    await supabase.from("profiles").update({ elo_rating: parseInt(newElo) }).eq("id", editUser.id);
    toast.success("Elo adjusted.");
    setEditUser(null);
    setNewElo("");
    fetchUsers();
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
              return (
                <TableRow key={u.id} className="border-border">
                  <TableCell className="font-medium">{u.username || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    {roles.map((r: string) => (
                      <Badge key={r} variant="outline" className="mr-1 text-xs">{r}</Badge>
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
                      {!roles.includes("moderator") && !roles.includes("admin") && (
                        <Button variant="ghost" size="icon" onClick={() => handlePromote(u.id)} title="Promote to Moderator">
                          <ShieldCheck className="h-4 w-4 text-gold" />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => { setEditUser(u); setNewElo(String(u.elo_rating)); }}>
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle>Adjust Elo for {u.username}</DialogTitle>
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
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default UserManagement;
