import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X, History, BookOpen, Search } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/check", label: "Check a Pill", icon: Search },
    { to: "/history", label: "History", icon: History },
    { to: "/education", label: "Learn", icon: BookOpen },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Fent Finder
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button
                variant={isActive(link.to) ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
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
        <div className="border-t border-border/50 bg-background md:hidden animate-fade-in">
          <nav className="container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link 
                key={link.to} 
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={isActive(link.to) ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
