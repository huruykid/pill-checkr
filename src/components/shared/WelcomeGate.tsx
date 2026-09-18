import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/hooks/useI18n";

/**
 * The one screen a new user sees before the app. It keeps the legal
 * acceptance exactly (checkbox + pc_disclaimer_accepted) and replaces the
 * old three-slide walkthrough with a single "try it" action, so the first
 * thing a person does is a real check instead of reading about one.
 */
const ACCEPTED_KEY = "pc_disclaimer_accepted";
/** Still written on accept so anything keyed on the old walkthrough keeps working. */
const LEGACY_ONBOARDING_KEY = "pc_onboarding_complete";

export const SAMPLE_IMPRINT = "M 30";

export function useDisclaimerAccepted(): boolean {
  const [accepted, setAccepted] = useState(() => localStorage.getItem(ACCEPTED_KEY) === "true");
  useEffect(() => {
    const check = () => setAccepted(localStorage.getItem(ACCEPTED_KEY) === "true");
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);
  return accepted;
}

interface WelcomeGateProps {
  onAccept: () => void;
}

export function WelcomeGate({ onAccept }: WelcomeGateProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  const accept = () => {
    localStorage.setItem(ACCEPTED_KEY, "true");
    localStorage.setItem(LEGACY_ONBOARDING_KEY, "true");
    onAccept();
  };

  const tryIt = () => {
    accept();
    navigate(`/check?imprint=${encodeURIComponent(SAMPLE_IMPRINT)}&auto=1`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-2 border-warning/30 bg-card p-6 md:p-8 shadow-xl animate-fade-in">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-light">
            <Shield className="h-8 w-8 text-warning" />
          </div>

          <h2 className="text-2xl font-bold text-foreground">{t("gate.title")}</h2>

          <div className="space-y-3 text-left w-full">
            {[t("gate.item1"), t("gate.item2"), t("gate.item3"), t("gate.item4")].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground font-sans normal-case">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </div>
            ))}
          </div>

          <label className="flex items-start gap-3 w-full rounded-lg border border-border bg-muted/30 p-3 cursor-pointer">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground font-sans normal-case leading-relaxed">
              {t("gate.checkbox")}
            </span>
          </label>

          <div className="w-full space-y-2">
            <Button onClick={accept} disabled={!checked} size="lg" className="w-full">
              {t("gate.accept")}
            </Button>
            <Button onClick={tryIt} disabled={!checked} size="lg" variant="outline" className="w-full gap-2">
              <Zap className="h-4 w-4" />
              {t("welcome.try").replace("{imprint}", SAMPLE_IMPRINT)}
            </Button>
            <p className="text-xs text-muted-foreground font-sans normal-case">{t("welcome.tryHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
