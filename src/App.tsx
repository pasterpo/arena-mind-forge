import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
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

const queryClient = new QueryClient();

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full gradient-gold mx-auto animate-pulse-gold flex items-center justify-center">
            <span className="font-display text-lg font-bold text-primary-foreground">A</span>
          </div>
          <p className="text-muted-foreground">Loading Aletheia Arena...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

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
        <Route path="/tournament/:id" element={<Tournament />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/past" element={<PastTournaments />} />
        <Route path="/discussions" element={<Discussions />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
