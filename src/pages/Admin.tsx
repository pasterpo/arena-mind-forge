import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorPermissions } from "@/hooks/useModeratorPermissions";
import { Navigate, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProblemForge from "@/components/admin/ProblemForge";
import TournamentPanel from "@/components/admin/TournamentPanel";
import UserManagement from "@/components/admin/UserManagement";
import DiscussionPanel from "@/components/admin/DiscussionPanel";
import QuestionBankBrowser from "@/components/admin/QuestionBankBrowser";
import { Shield, Swords, Users, ImageIcon, MessageSquare, Library, Zap, BarChart3, Ban, Trophy, Activity, FileText } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const { user, isAdmin, isAdminOrMod, loading } = useAuth();
  const perms = useModeratorPermissions();
  const navigate = useNavigate();
  const [questionCount, setQuestionCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [submissionsToday, setSubmissionsToday] = useState(0);
  const [suspendedCount, setSuspendedCount] = useState(0);

  const refreshStats = async () => {
    const { count: qc } = await supabase.from("question_bank").select("*", { count: "exact", head: true });
    setQuestionCount(qc || 0);
    const { count: uc } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    setUserCount(uc || 0);
    const { count: tc } = await supabase.from("tournaments").select("*", { count: "exact", head: true });
    setTournamentCount(tc || 0);
    const { count: ac } = await supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("status", "active");
    setActiveCount(ac || 0);
    const today = new Date().toISOString().split("T")[0];
    const { count: sc } = await supabase.from("submissions").select("*", { count: "exact", head: true }).gte("created_at", today);
    setSubmissionsToday(sc || 0);
    const { count: susp } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("account_status", "suspended");
    setSuspendedCount(susp || 0);
  };

  useEffect(() => { refreshStats(); }, []);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user || !isAdminOrMod) return <Navigate to="/" replace />;

  const showForge = perms.can_create_problems || perms.can_edit_problems;
  const showBank = perms.can_edit_problems || perms.can_delete_problems;
  const showTournaments = perms.can_create_tournaments || perms.can_edit_tournaments;
  const showUsers = isAdmin || perms.can_manage_users;
  const showDiscussions = perms.can_view_discussions || perms.can_moderate_discussions;

  const handleAutoComplete = async () => {
    try {
      await supabase.rpc("auto_complete_tournaments");
      await supabase.rpc("update_global_ranks");
      await refreshStats();
      toast.success("Done! Expired tournaments completed and ranks updated.");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleRecalcRanks = async () => {
    await supabase.rpc("update_global_ranks");
    await refreshStats();
    toast.success("Global ranks recalculated.");
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-gold" />
        <h1 className="font-display text-3xl font-bold text-foreground">Command Center</h1>
        <Badge className="bg-gold/20 text-gold border-gold/30">{isAdmin ? "ADMIN" : "MODERATOR"}</Badge>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <ImageIcon className="h-6 w-6 mx-auto mb-2 text-gold" />
            <p className="text-2xl font-bold font-mono text-foreground">{questionCount}</p>
            <p className="text-xs text-muted-foreground">Questions</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold font-mono text-foreground">{userCount}</p>
            <p className="text-xs text-muted-foreground">Users</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Swords className="h-6 w-6 mx-auto mb-2 text-amber-700" />
            <p className="text-2xl font-bold font-mono text-foreground">{tournamentCount}</p>
            <p className="text-xs text-muted-foreground">Competitions</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Activity className="h-6 w-6 mx-auto mb-2 text-gold" />
            <p className="text-2xl font-bold font-mono text-foreground">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <FileText className="h-6 w-6 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold font-mono text-foreground">{submissionsToday}</p>
            <p className="text-xs text-muted-foreground">Submissions Today</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Ban className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold font-mono text-foreground">{suspendedCount}</p>
            <p className="text-xs text-muted-foreground">Suspended</p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-gold" /> Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleAutoComplete} className="gap-1">
                <Zap className="h-4 w-4" /> Auto-Complete Expired
              </Button>
              <Button variant="outline" size="sm" onClick={handleRecalcRanks} className="gap-1">
                <BarChart3 className="h-4 w-4" /> Recalculate Ranks
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/leaderboard")} className="gap-1">
                <Trophy className="h-4 w-4" /> View Leaderboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={showForge ? "forge" : showTournaments ? "tournaments" : "discussions"} className="space-y-4">
        <TabsList className="bg-secondary border border-border flex-wrap h-auto gap-1 p-1">
          {showForge && (
            <TabsTrigger value="forge" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
              Problem Forge
            </TabsTrigger>
          )}
          {showBank && (
            <TabsTrigger value="bank" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
              Question Bank
            </TabsTrigger>
          )}
          {showTournaments && (
            <>
              <TabsTrigger value="tournaments" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
                Tournaments
              </TabsTrigger>
              <TabsTrigger value="olympiads" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
                Olympiads
              </TabsTrigger>
              <TabsTrigger value="jee" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
                JEE Mocks
              </TabsTrigger>
            </>
          )}
          {showUsers && (
            <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
              Users
            </TabsTrigger>
          )}
          {showDiscussions && (
            <TabsTrigger value="discussions" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
              Discussions
            </TabsTrigger>
          )}
        </TabsList>

        {showForge && <TabsContent value="forge"><ProblemForge onSaved={refreshStats} /></TabsContent>}
        {showBank && <TabsContent value="bank"><QuestionBankBrowser /></TabsContent>}
        {showTournaments && (
          <>
            <TabsContent value="tournaments"><TournamentPanel fixedType="tournament" /></TabsContent>
            <TabsContent value="olympiads"><TournamentPanel fixedType="olympiad" /></TabsContent>
            <TabsContent value="jee"><TournamentPanel fixedType="jee" /></TabsContent>
          </>
        )}
        {showUsers && <TabsContent value="users"><UserManagement /></TabsContent>}
        {showDiscussions && <TabsContent value="discussions"><DiscussionPanel /></TabsContent>}
      </Tabs>
    </div>
  );
};

export default Admin;
