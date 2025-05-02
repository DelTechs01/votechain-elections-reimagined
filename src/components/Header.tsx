
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/WalletConnect";
import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Header() {
  const { account, isAdmin } = useWeb3();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full ${
        isScrolled
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      } transition-all duration-200`}
    >
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-blue-600 to-teal-500 w-8 h-8 rounded-md flex items-center justify-center text-white font-bold">
            V
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
            VoteChain
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Home
          </Link>
          <Link to="/elections" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Elections
          </Link>
          {account && (
            <>
              <Link to="/vote" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Vote
              </Link>
              <Link to="/kyc" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                KYC
              </Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <WalletConnect />
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden glass-panel mx-4 my-2 p-4 animate-fade-in">
          <nav className="flex flex-col gap-4 mb-4">
            <Link 
              to="/" 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/elections" 
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsMenuOpen(false)}
            >
              Elections
            </Link>
            {account && (
              <>
                <Link 
                  to="/vote" 
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Vote
                </Link>
                <Link 
                  to="/kyc" 
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  KYC
                </Link>
              </>
            )}
            {isAdmin && (
              <Link 
                to="/admin" 
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
