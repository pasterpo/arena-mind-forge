import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorPermissions } from "@/hooks/useModeratorPermissions";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProblemForge from "@/components/admin/ProblemForge";
import TournamentPanel from "@/components/admin/TournamentPanel";
import UserManagement from "@/components/admin/UserManagement";
import DiscussionPanel from "@/components/admin/DiscussionPanel";
import QuestionBankBrowser from "@/components/admin/QuestionBankBrowser";
import { Shield, Swords, Users, ImageIcon, MessageSquare, Library } from "lucide-react";

const Admin = () => {
  const { user, isAdmin, isAdminOrMod, loading } = useAuth();
  const perms = useModeratorPermissions();
  const [questionCount, setQuestionCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [tournamentCount, setTournamentCount] = useState(0);

  const refreshStats = async () => {
    const { count: qc } = await supabase.from("question_bank").select("*", { count: "exact", head: true });
    setQuestionCount(qc || 0);
    const { count: uc } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    setUserCount(uc || 0);
    const { count: tc } = await supabase.from("tournaments").select("*", { count: "exact", head: true });
    setTournamentCount(tc || 0);
  };

  useEffect(() => { refreshStats(); }, []);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user || !isAdminOrMod) return <Navigate to="/" replace />;

  const showForge = perms.can_create_problems || perms.can_edit_problems;
  const showBank = perms.can_edit_problems || perms.can_delete_problems;
  const showTournaments = perms.can_create_tournaments || perms.can_edit_tournaments;
  const showUsers = isAdmin || perms.can_manage_users;
  const showDiscussions = perms.can_view_discussions || perms.can_moderate_discussions;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-gold" />
        <h1 className="font-display text-3xl font-bold text-foreground">Command Center</h1>
        <Badge className="bg-gold/20 text-gold border-gold/30">{isAdmin ? "ADMIN" : "MODERATOR"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gold" />
            <p className="text-2xl font-bold font-mono text-foreground">{questionCount}</p>
            <p className="text-sm text-muted-foreground">Questions in Bank</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold font-mono text-foreground">{userCount}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <Swords className="h-8 w-8 mx-auto mb-2 text-amber-700" />
            <p className="text-2xl font-bold font-mono text-foreground">{tournamentCount}</p>
            <p className="text-sm text-muted-foreground">Total Competitions</p>
          </CardContent>
        </Card>
      </div>

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
