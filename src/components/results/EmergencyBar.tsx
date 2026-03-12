import { Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

interface EmergencyBarProps {
  className?: string;
}

export function EmergencyBar({ className }: EmergencyBarProps) {
  const { t } = useI18n();

  return (
    <div className={`sticky top-14 z-40 rounded-lg border-2 border-destructive bg-destructive/10 p-4 space-y-3 ${className || ""}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive animate-pulse-subtle" />
        <h3 className="font-bold text-destructive uppercase tracking-wide text-sm">
          {t("emergency.title")}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <a href="tel:911" className="block">
          <Button variant="danger" className="w-full gap-1.5 text-xs sm:text-sm" size="lg">
            <Phone className="h-4 w-4 shrink-0" />
            {t("emergency.911")}
          </Button>
        </a>

        <a href="tel:18002221222" className="block">
          <Button variant="warning" className="w-full gap-1.5 text-xs sm:text-sm" size="lg">
            <Phone className="h-4 w-4 shrink-0" />
            {t("emergency.poisonControl")}
          </Button>
        </a>

        <a href="tel:988" className="block">
          <Button variant="outline" className="w-full gap-1.5 text-xs sm:text-sm border-primary text-primary hover:bg-primary hover:text-primary-foreground" size="lg">
            <Phone className="h-4 w-4 shrink-0" />
            {t("emergency.988")}
          </Button>
        </a>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t("emergency.footer")}
      </p>
    </div>
  );
}
