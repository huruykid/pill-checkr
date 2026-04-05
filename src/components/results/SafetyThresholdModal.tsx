import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

interface SafetyThresholdModalProps {
  open: boolean;
  onDismiss: () => void;
}

export function SafetyThresholdModal({ open, onDismiss }: SafetyThresholdModalProps) {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      return;
    }
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, countdown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-warning/40 bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Amber header */}
        <div className="bg-warning/20 border-b border-warning/30 px-6 py-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
          <h2 className="text-lg font-bold text-foreground">{t("safety.modal.title")}</h2>
        </div>

        {/* Bullet points */}
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-warning font-bold">•</span>
            <p className="text-sm text-foreground font-medium">{t("safety.modal.bullet1")}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-warning font-bold">•</span>
            <p className="text-sm text-foreground font-medium">{t("safety.modal.bullet2")}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-warning font-bold">•</span>
            <p className="text-sm text-foreground font-medium">{t("safety.modal.bullet3")}</p>
          </div>
        </div>

        {/* Button with countdown */}
        <div className="px-6 pb-6">
          <Button
            onClick={onDismiss}
            disabled={countdown > 0}
            className="w-full whitespace-normal h-auto py-3"
            variant={countdown > 0 ? "secondary" : "warning"}
            size="lg"
          >
            {countdown > 0
              ? t("safety.modal.button_wait").replace("{seconds}", String(countdown))
              : t("safety.modal.button_ready")}
          </Button>
        </div>
      </div>
    </div>
  );
}
