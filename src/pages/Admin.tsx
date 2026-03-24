import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProblemForge from "@/components/admin/ProblemForge";
import TournamentPanel from "@/components/admin/TournamentPanel";
import UserManagement from "@/components/admin/UserManagement";
import { Shield, Swords, Users, ImageIcon } from "lucide-react";

const Admin = () => {
  const { user, isAdminOrMod, loading } = useAuth();
  const [questionCount, setQuestionCount] = useState(0);

  const refreshQuestions = async () => {
    const { count } = await supabase.from("question_bank").select("*", { count: "exact", head: true });
    setQuestionCount(count || 0);
  };

  useEffect(() => { refreshQuestions(); }, []);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user || !isAdminOrMod) return <Navigate to="/" replace />;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-gold" />
        <h1 className="font-display text-3xl font-bold text-foreground">Command Center</h1>
        <Badge className="bg-gold/20 text-gold border-gold/30">ADMIN</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-6 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gold" />
            <p className="text-2xl font-bold font-mono text-foreground">{questionCount}</p>
            <p className="text-sm text-muted-foreground">Questions in Bank</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forge" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="forge" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
            Problem Forge
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
            Tournaments
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forge">
          <ProblemForge onSaved={refreshQuestions} />
        </TabsContent>
        <TabsContent value="tournaments">
          <TournamentPanel />
        </TabsContent>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
