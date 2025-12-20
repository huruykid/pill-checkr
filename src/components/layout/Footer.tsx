import { Link } from "react-router-dom";
import { Shield, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="container py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">Fent Finder</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A harm reduction tool to help assess potential pill risks. 
              This is not medical advice.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <nav className="flex flex-col gap-2">
              <Link 
                to="/check" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Check a Pill
              </Link>
              <Link 
                to="/education" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Learn About Safety
              </Link>
              <Link 
                to="/history" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                View History
              </Link>
            </nav>
          </div>

          {/* Emergency */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Emergency</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                If you suspect an overdose:
              </p>
              <p className="text-lg font-bold text-danger">
                Call 911 Immediately
              </p>
              <p className="text-sm text-muted-foreground">
                Administer naloxone if available
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} Fent Finder. For harm reduction purposes only.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Made with <Heart className="h-3 w-3 text-danger" /> for harm reduction
          </p>
        </div>
      </div>
    </footer>
  );
}
