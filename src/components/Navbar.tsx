import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Shield, Trophy, User, LogOut, Swords, MessageSquare, History, BookOpen, FlaskConical, HelpCircle, Sun, Moon, Menu } from "lucide-react";

const Navbar = () => {
  const { user, isAdminOrMod, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Home", icon: Trophy },
    { path: "/tournaments", label: "Tournaments", icon: Swords },
    { path: "/olympiads", label: "Olympiads", icon: BookOpen },
    { path: "/jee", label: "JEE Mocks", icon: FlaskConical },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/past", label: "Past", icon: History },
    { path: "/discussions", label: "Discuss", icon: MessageSquare },
    { path: "/manual", label: "Manual", icon: HelpCircle },
  ];

  if (isAdminOrMod) {
    navItems.push({ path: "/admin", label: "Command Center", icon: Shield });
  }

  const isActive = (path: string) => location.pathname === path;

  // UX-01 FIX: Mobile hamburger menu
  if (isMobile) {
    return (
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full gradient-gold flex items-center justify-center">
              <span className="font-display text-sm font-bold text-primary-foreground">A</span>
            </div>
            <span className="font-display text-lg font-semibold text-foreground tracking-wide">Arena</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-card border-border">
                <div className="flex flex-col gap-1 mt-8">
                  {navItems.map(({ path, label, icon: Icon }) => (
                    <Link key={path} to={path} onClick={() => setSheetOpen(false)}>
                      <Button variant={isActive(path) ? "secondary" : "ghost"} className={`w-full justify-start ${isActive(path) ? "text-gold" : "text-muted-foreground"}`}>
                        <Icon className="h-4 w-4 mr-2" /> {label}
                      </Button>
                    </Link>
                  ))}
                  <div className="border-t border-border mt-2 pt-2">
                    <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/profile"); setSheetOpen(false); }}>
                      <User className="h-4 w-4 mr-2" /> Profile
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { signOut(); setSheetOpen(false); }}>
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    );
  }

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
              <Button variant={isActive(path) ? "secondary" : "ghost"} size="sm" className={isActive(path) ? "text-gold" : "text-muted-foreground hover:text-foreground"}>
                <Icon className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">{label}</span>
              </Button>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}><User className="h-4 w-4 mr-2" /> Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="h-4 w-4 mr-2" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
