import { forwardRef, useState } from "react";
import { Phone, X, AlertTriangle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface EmergencyFABProps {
  /** When true, the FAB pulses and is larger — used on high-risk results */
  urgent?: boolean;
}

export const EmergencyFAB = forwardRef<HTMLDivElement, EmergencyFABProps>(function EmergencyFAB({ urgent = false }, ref) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const LINES = [
    { label: "911", number: "911", description: t("fab.911desc"), color: "bg-danger text-danger-foreground" },
    { label: t("emergency.poisonControl"), number: "18002221222", description: t("fab.poisonDesc"), color: "bg-warning text-warning-foreground" },
    { label: t("emergency.988"), number: "988", description: t("fab.988desc"), color: "bg-primary text-primary-foreground" },
    { label: t("hr.neverUseAlone"), number: "18004843731", description: t("fab.nuaDesc"), color: "bg-success text-success-foreground" },
  ];

  return (
    <div ref={ref} className="fixed right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6"
      style={{ bottom: "calc(var(--tab-bar-space, 56px) + env(safe-area-inset-bottom) + 12px)" }}>
      {/* Expanded panel */}
      {open && (
        <div className="w-72 rounded-xl border border-border bg-card shadow-xl animate-slide-up">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <span className="text-sm font-bold uppercase tracking-wide text-foreground">{t("fab.title")}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2 space-y-1">
            {LINES.map((line) => (
              <a
                key={line.number}
                href={`tel:${line.number}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full shrink-0", line.color)}>
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground font-sans normal-case">{line.label}</p>
                  <p className="text-xs text-muted-foreground font-sans normal-case">{line.description}</p>
                </div>
              </a>
            ))}
          </div>
          <div className="border-t border-border px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground text-center font-sans normal-case">
              {t("fab.footer")}
            </p>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Emergency help"
        className={cn(
          "flex items-center justify-center rounded-full shadow-lg transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open
            ? "h-12 w-12 bg-muted text-muted-foreground hover:bg-muted/80"
            : urgent
              ? "h-16 w-16 bg-danger text-danger-foreground animate-pulse-subtle hover:scale-105"
              : "h-14 w-14 bg-danger/90 text-danger-foreground hover:bg-danger hover:scale-105"
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : urgent ? (
          <Phone className="h-7 w-7" />
        ) : (
          <Phone className="h-6 w-6" />
        )}
      </button>
    </div>
  );
});
