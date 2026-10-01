import { useState, useEffect, useRef, type RefObject } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/hooks/useI18n";

interface SafetyThresholdModalProps {
  open: boolean;
  onDismiss: () => void;
  /** Where focus returns after dismissal (the risk summary on Results). */
  restoreFocusTo?: RefObject<HTMLElement>;
}

/**
 * The one-time "before you view these results" gate. Built on Radix
 * AlertDialog so it is a real modal: role="alertdialog", labelled by its
 * title, focus trapped inside, everything behind it aria-hidden and
 * pointer-inert. The 3-second countdown stays: Escape and outside taps do
 * nothing until it reaches zero, then focus lands on the enabled button.
 */
export function SafetyThresholdModal({ open, onDismiss, restoreFocusTo }: SafetyThresholdModalProps) {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState(3);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setCountdown(3);
      return;
    }
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, countdown]);

  // The disabled button is not focusable; focus it the moment it enables so
  // a screen-reader user hears it without a per-second live region.
  useEffect(() => {
    if (open && countdown === 0) buttonRef.current?.focus();
  }, [open, countdown]);

  const ready = countdown <= 0;

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next && ready) onDismiss(); }}>
      <AlertDialogContent
        className="max-w-md overflow-hidden rounded-xl border border-warning/40 p-0"
        onEscapeKeyDown={(e) => { if (!ready) e.preventDefault(); }}
        onCloseAutoFocus={(e) => {
          if (restoreFocusTo?.current) {
            e.preventDefault();
            restoreFocusTo.current.focus({ preventScroll: true });
          }
        }}
      >
        {/* Amber header */}
        <div className="flex items-center gap-3 border-b border-warning/30 bg-warning/20 px-6 py-4">
          <AlertTriangle className="h-6 w-6 shrink-0 text-warning" aria-hidden="true" />
          <AlertDialogTitle className="text-lg font-bold text-foreground">{t("safety.modal.title")}</AlertDialogTitle>
        </div>

        {/* Bullet points. asChild because Description renders a <p>, which cannot contain a list. */}
        <AlertDialogDescription asChild>
          <div className="space-y-3 px-6 py-5 text-left">
            <ul className="space-y-3">
              {["safety.modal.bullet1", "safety.modal.bullet2", "safety.modal.bullet3"].map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <span className="mt-0.5 font-bold text-warning" aria-hidden="true">•</span>
                  <span className="text-sm font-medium text-foreground">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </AlertDialogDescription>

        {/* Button with countdown */}
        <div className="px-6 pb-6">
          <Button
            ref={buttonRef}
            onClick={onDismiss}
            disabled={!ready}
            className="w-full whitespace-normal h-auto py-3"
            variant={ready ? "warning" : "secondary"}
            size="lg"
          >
            {ready
              ? t("safety.modal.button_ready")
              : t("safety.modal.button_wait").replace("{seconds}", String(countdown))}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
