import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { MapPin, Crosshair } from "lucide-react";
import type { Precision } from "@/lib/geo";

/**
 * Precise location is opt-in, per report, never remembered.
 * The copy states the real tradeoff instead of burying it.
 */
export function PrecisionChoice({
  value,
  onChange,
}: {
  value: Precision;
  onChange: (p: Precision) => void;
}) {
  const options: { value: Precision; label: string; hint: string; icon: typeof MapPin }[] = [
    { value: "city", label: "City only", hint: "Recommended", icon: MapPin },
    { value: "precise", label: "Exact spot", hint: "More useful, less private", icon: Crosshair },
  ];

  return (
    <div className="space-y-2">
      <Label>Location detail</Label>
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
        {value === "precise" ? (
          <>
            An exact point makes bad-batch clusters visible block by block. It is stored separately, never shown
            publicly, deleted after 30 days — but it could be subpoenaed. Homes always display as a wide area.
          </>
        ) : (
          <>Only your city and a wide map area are stored. Your coordinates are used once on your device and by a
          map service to find your city name — we never store them.</>
        )}
      </p>
    </div>
  );
}
