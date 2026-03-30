import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Tournament from "./pages/Tournament";
import Results from "./pages/Results";
import PastTournaments from "./pages/PastTournaments";
import Discussions from "./pages/Discussions";
import Admin from "./pages/Admin";
import Tournaments from "./pages/Tournaments";
import Olympiads from "./pages/Olympiads";
import JeeMocks from "./pages/JeeMocks";
import Manual from "./pages/Manual";
import NotFound from "./pages/NotFound";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";

const ProtectedLayout = () => {
  const { user, loading, signOut } = useAuth();
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!user) { setStatusLoading(false); return; }
    supabase.from("profiles").select("account_status").eq("id", user.id).single()
      .then(({ data }) => {
        setAccountStatus(data?.account_status || "active");
        setStatusLoading(false);
      });
  }, [user]);

  if (loading || statusLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full gradient-gold mx-auto animate-pulse flex items-center justify-center">
            <span className="font-display text-lg font-bold text-primary-foreground">A</span>
          </div>
          <p className="text-muted-foreground">Loading Aletheia Arena...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (accountStatus === "suspended") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="font-display text-3xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground">Your account has been suspended. Contact an administrator if you believe this is an error.</p>
          <Button onClick={signOut} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/olympiads" element={<Olympiads />} />
        <Route path="/jee" element={<JeeMocks />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/tournament/:id" element={<Tournament />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/past" element={<PastTournaments />} />
        <Route path="/discussions" element={<Discussions />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <ThemeProvider>
    <TooltipProvider>
      <Sonner position="top-right" richColors closeButton />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
