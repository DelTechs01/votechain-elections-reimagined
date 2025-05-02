
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "404 - Page Not Found | VoteChain";
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">404</h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        <div className="glass-panel p-6 max-w-md mx-auto mb-8">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The path <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">{location.pathname}</code> was not found on this server.
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            Perhaps you meant to access one of our election pages or the voting dashboard?
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/">
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
