import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shield, Trophy, User, LogOut, Swords, MessageSquare, History, BookOpen, FlaskConical, HelpCircle } from "lucide-react";

const Navbar = () => {
  const { user, isAdminOrMod, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Trophy },
    { path: "/tournaments", label: "Tournaments", icon: Swords },
    { path: "/olympiads", label: "Olympiads", icon: BookOpen },
    { path: "/jee", label: "JEE Mocks", icon: FlaskConical },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/past", label: "Past", icon: History },
    { path: "/discussions", label: "Discuss", icon: MessageSquare },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/manual", label: "Manual", icon: HelpCircle },
  ];

  if (isAdminOrMod) {
    navItems.push({ path: "/admin", label: "Command Center", icon: Shield });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center">
            <span className="font-display text-sm font-bold text-primary-foreground">A</span>
          </div>
          <span className="font-display text-lg font-semibold text-foreground tracking-wide hidden sm:inline">
            Aletheia Arena
          </span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path}>
              <Button
                variant={isActive(path) ? "secondary" : "ghost"}
                size="sm"
                className={isActive(path) ? "text-gold" : "text-muted-foreground hover:text-foreground"}
              >
                <Icon className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">{label}</span>
              </Button>
            </Link>
          ))}
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {(user.user_metadata?.name || user.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs text-muted-foreground">{user.email}</DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
