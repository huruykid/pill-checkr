import { forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X, History, BookOpen, Search, User, LogOut, MapPin, Settings, Users, Code, TrendingUp, Globe, Download } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n, LANGUAGES, LANGUAGE_LABELS, type Language } from "@/hooks/useI18n";

export const Header = forwardRef<HTMLElement>(function Header(_props, ref) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();

  const navLinks = [
    { to: "/check", label: t("nav.checkPill"), icon: Search },
    { to: "/history", label: t("nav.history"), icon: History },
    { to: "/education", label: t("nav.learn"), icon: BookOpen },
    { to: "/nearby-help", label: t("nav.findHelp"), icon: MapPin },
    { to: "/contribute", label: t("nav.contribute"), icon: Users },
    { to: "/api-docs", label: t("nav.api"), icon: Code },
    { to: "/trends", label: t("nav.trends"), icon: TrendingUp },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header ref={ref} className="sticky top-0 z-50 w-full border-b-4 border-secondary bg-foreground">
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
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-background/80 hover:text-background hover:bg-background/10 font-mono text-xs"
              onClick={() => {
                const idx = LANGUAGES.indexOf(lang as Language);
                setLang(LANGUAGES[(idx + 1) % LANGUAGES.length]);
              }}
              title={LANGUAGE_LABELS[lang as Language]}
            >
              <Globe className="h-3.5 w-3.5" />
              {lang.toUpperCase()}
            </Button>
          </div>
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
                  {t("nav.settings")}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-background/80 hover:text-background hover:bg-background/10"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signOut")}
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
                {t("nav.signIn")}
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
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-background/80 hover:text-background hover:bg-background/10 font-mono"
              onClick={() => {
                const idx = LANGUAGES.indexOf(lang as Language);
                setLang(LANGUAGES[(idx + 1) % LANGUAGES.length]);
              }}
            >
              <Globe className="h-5 w-5" />
              {LANGUAGE_LABELS[lang as Language]} → {LANGUAGE_LABELS[LANGUAGES[(LANGUAGES.indexOf(lang as Language) + 1) % LANGUAGES.length]]}
            </Button>
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
                    {t("nav.settings")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-background/80 hover:text-background hover:bg-background/10"
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                >
                  <LogOut className="h-5 w-5" />
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-background/80 hover:text-background hover:bg-background/10"
                >
                  <User className="h-5 w-5" />
                  {t("nav.signIn")}
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
