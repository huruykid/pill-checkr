import { useState, useEffect } from "react";
import { AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/hooks/useI18n";

const ACCEPTED_KEY = "ff_disclaimer_accepted";

export function useDisclaimerAccepted(): boolean {
  const [accepted, setAccepted] = useState(() => localStorage.getItem(ACCEPTED_KEY) === "true");
  useEffect(() => {
    const check = () => setAccepted(localStorage.getItem(ACCEPTED_KEY) === "true");
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);
  return accepted;
}

interface DisclaimerGateProps {
  onAccept: () => void;
}

export function DisclaimerGate({ onAccept }: DisclaimerGateProps) {
  const { t } = useI18n();
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    localStorage.setItem(ACCEPTED_KEY, "true");
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border-2 border-warning/30 bg-card p-6 md:p-8 shadow-xl animate-fade-in">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-light">
            <Shield className="h-8 w-8 text-warning" />
          </div>

          <h2 className="text-2xl font-bold text-foreground">{t("gate.title")}</h2>

          <div className="space-y-3 text-left w-full">
            {[
              t("gate.item1"),
              t("gate.item2"),
              t("gate.item3"),
              t("gate.item4"),
            ].map((item, i) => (
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

          <Button
            onClick={handleAccept}
            disabled={!checked}
            size="lg"
            className="w-full"
          >
            {t("gate.accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
