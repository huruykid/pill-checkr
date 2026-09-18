import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { MapPin, Crosshair } from "lucide-react";
import type { Precision } from "@/lib/geo";
import { useI18n } from "@/hooks/useI18n";

/**
 * Precise location is opt-in, per report, never remembered.
 * The copy states the real tradeoff instead of burying it. Translations
 * must carry the same weight (the subpoena sentence stays).
 */
export function PrecisionChoice({
  value,
  onChange,
}: {
  value: Precision;
  onChange: (p: Precision) => void;
}) {
  const { t } = useI18n();
  const options: { value: Precision; label: string; hint: string; icon: typeof MapPin }[] = [
    { value: "city", label: t("precision.city"), hint: t("precision.cityHint"), icon: MapPin },
    { value: "precise", label: t("precision.precise"), hint: t("precision.preciseHint"), icon: Crosshair },
  ];

  return (
    <div className="space-y-2">
      <Label>{t("precision.label")}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              "flex min-h-[56px] flex-col justify-center rounded-lg border-2 px-3 py-2 text-left transition-colors",
              value === o.value ? "border-foreground bg-foreground text-background" : "border-border bg-card",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <o.icon className="h-4 w-4" />
              {o.label}
            </span>
            <span className="text-[11px] opacity-80">{o.hint}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {value === "precise" ? t("precision.preciseCopy") : t("precision.cityCopy")}
      </p>
    </div>
  );
}
