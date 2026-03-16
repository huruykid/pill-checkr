import { Link } from "react-router-dom";
import { Shield, Heart } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export function Footer() {
  const { t } = useI18n();

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
              {t("footer.brand")}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("footer.quickLinks")}</h3>
            <nav className="flex flex-col gap-2">
              <Link 
                to="/check" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("footer.checkPill")}
              </Link>
              <Link 
                to="/education" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("footer.learnSafety")}
              </Link>
              <Link 
                to="/history" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("footer.viewHistory")}
              </Link>
            </nav>
          </div>

          {/* Emergency */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("footer.emergency")}</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("footer.suspectOverdose")}
              </p>
              <p className="text-lg font-bold text-danger">
                {t("footer.call911")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("footer.administerNaloxone")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            {t("footer.copyright").replace("{year}", new Date().getFullYear().toString())}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t("footer.madeWith")} <Heart className="h-3 w-3 text-danger" /> {t("footer.forHR")}
          </p>
        </div>
      </div>
    </footer>
  );
}
