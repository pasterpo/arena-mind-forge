import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 rounded-full gradient-gold mx-auto flex items-center justify-center">
          <span className="font-display text-2xl font-bold text-primary-foreground">A</span>
        </div>
        <h1 className="font-display text-5xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">This page doesn't exist in the Arena.</p>
        <Link to="/">
          <Button variant="outline" className="hover:border-gold/50 hover:text-gold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Arena
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
