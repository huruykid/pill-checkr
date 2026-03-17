import { forwardRef } from "react";
import { AlertTriangle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface DisclaimerProps {
  variant?: "default" | "compact" | "emergency";
  className?: string;
}

export const Disclaimer = forwardRef<HTMLDivElement, DisclaimerProps>(function Disclaimer({ variant = "default", className }, ref) {
  const { t } = useI18n();

  if (variant === "emergency") {
    return (
      <div className={cn(
        "rounded-xl border-2 border-danger/30 bg-danger-light p-4 md:p-6",
        className
      )}>
        <div className="flex items-start gap-3">
          <Phone className="h-6 w-6 text-danger shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold text-danger text-lg">
              {t("disclaimer.emergencyTitle")}
            </p>
            <p className="text-sm text-danger/80">
              {t("disclaimer.emergencyDesc")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg bg-warning-light px-3 py-2 text-sm",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <p className="text-warning-foreground">
          {t("disclaimer.compact")}
        </p>
      </div>
    );
  }

  const items = [
    t("disclaimer.item1"),
    t("disclaimer.item2"),
    t("disclaimer.item3"),
    t("disclaimer.item4"),
  ];

  return (
    <div className={cn(
      "rounded-xl border border-warning/30 bg-warning-light/50 p-4 md:p-6",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
        <div className="space-y-3">
          <p className="font-semibold text-warning-foreground">
            {t("disclaimer.title")}
          </p>
          <ul className="space-y-2 text-sm text-warning-foreground/90">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
