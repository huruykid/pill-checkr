import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X, History, BookOpen, Search, User, LogOut, MapPin, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navLinks = [
    { to: "/check", label: "Check a Pill", icon: Search },
    { to: "/history", label: "History", icon: History },
    { to: "/education", label: "Learn", icon: BookOpen },
    { to: "/nearby-help", label: "Find Help", icon: MapPin },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b-4 border-secondary bg-foreground">
      <div className="container flex h-14 items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
            <Shield className="h-4 w-4 text-secondary-foreground" />
          </div>
          <span className="font-display text-2xl text-background tracking-wider">
            FENT FINDER
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 text-background/80 hover:text-background hover:bg-background/10 ${
                  isActive(link.to) ? "text-secondary bg-background/10" : ""
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-2 text-background/80 hover:text-background hover:bg-background/10 ${
                    isActive("/settings") ? "text-secondary bg-background/10" : ""
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-background/80 hover:text-background hover:bg-background/10"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 text-background/80 hover:text-background hover:bg-background/10 ${
                  isActive("/auth") ? "text-secondary bg-background/10" : ""
                }`}
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-background hover:bg-background/10"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-background/20 bg-foreground md:hidden animate-fade-in">
          <nav className="container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link 
                key={link.to} 
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 text-background/80 hover:text-background hover:bg-background/10 ${
                    isActive(link.to) ? "text-secondary" : ""
                  }`}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Button>
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 text-background/80 hover:text-background hover:bg-background/10 ${
                      isActive("/settings") ? "text-secondary" : ""
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-background/80 hover:text-background hover:bg-background/10"
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-background/80 hover:text-background hover:bg-background/10"
                >
                  <User className="h-5 w-5" />
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
