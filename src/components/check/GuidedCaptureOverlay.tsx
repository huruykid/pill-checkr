import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface GuidedCaptureOverlayProps {
  className?: string;
}

export const GuidedCaptureOverlay = forwardRef<HTMLDivElement, GuidedCaptureOverlayProps>(
  function GuidedCaptureOverlay({ className }, ref) {
    const { t } = useI18n();

    return (
      <div ref={ref} className={cn("pointer-events-none absolute inset-0 flex items-center justify-center", className)}>
        {/* Pill silhouette guide */}
        <div className="relative flex flex-col items-center gap-3">
          {/* Pill outline - capsule shape */}
          <div className="h-20 w-14 rounded-[2rem] border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center">
            <span className="text-[10px] font-medium text-primary/50 uppercase tracking-wider">
              {t("check.overlay.pill")}
            </span>
          </div>
          
          {/* Coin silhouette for scale reference */}
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <div className="h-10 w-10 rounded-full border-2 border-dashed border-secondary/40 bg-secondary/5 flex items-center justify-center">
              <span className="text-[8px] font-medium text-secondary/50">🪙</span>
            </div>
            <span className="text-[9px] text-muted-foreground/60">{t("check.overlay.coin")}</span>
          </div>

          {/* Center text */}
          <span className="text-xs text-muted-foreground/70 font-medium">
            {t("check.overlay.center")}
          </span>
        </div>
      </div>
    );
  }
);
