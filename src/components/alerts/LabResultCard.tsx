import { cn } from "@/lib/utils";
import { flagTrue, type ExternalLabReport } from "@/lib/externalData";
import { FlaskConical, MapPin, ShieldCheck } from "lucide-react";

// Verified lab result card. Mirrors AlertCard's anatomy so the feed reads as one
// system, but is visually distinguished by the source badge - users always know
// which rows came from a lab and which came from the community.
export function LabResultCard({ r, sourceName }: { r: ExternalLabReport; sourceName: string }) {
  const fent = flagTrue(r.lab_flags, "lab_fentanyl") || flagTrue(r.lab_flags, "lab_fentanyl_any");
  const xyl = flagTrue(r.lab_flags, "lab_xylazine") || flagTrue(r.lab_flags, "lab_xylazine_any");
  const nitaz = flagTrue(r.lab_flags, "lab_nitazenes_any");

  const soldAs = typeof r.substance_expected === "string" ? r.substance_expected : "";
  const detected = Array.isArray(r.substances_detected)
    ? r.substances_detected.filter((s): s is string => typeof s === "string" && !!s)
    : [];
  const title = soldAs ? `Sold as ${soldAs}` : detected[0] || "Unknown sample";
  const where = [r.county, r.state].filter(Boolean).join(", ") || "Location approximate";
  const when = r.collected_on && !isNaN(new Date(r.collected_on).getTime())
    ? new Date(r.collected_on + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <li className={cn(
      "rounded-xl border bg-card p-4 md:p-5",
      fent || nitaz ? "border-l-4 border-l-danger border-danger/30" : "border-border",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight truncate">{title}</p>
          {detected.length > 0 && (
            <p className="text-sm text-muted-foreground truncate">lab found: {detected.join(", ")}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1 bg-foreground text-background">
          <ShieldCheck className="h-3 w-3" />
          Lab result
        </span>
      </div>

      {(fent || xyl || nitaz) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {fent && (
            <span className="rounded-full bg-danger text-danger-foreground px-2.5 py-1 text-xs font-semibold flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />Fentanyl detected
            </span>
          )}
          {nitaz && (
            <span className="rounded-full bg-danger text-danger-foreground px-2.5 py-1 text-xs font-semibold">
              Nitazenes detected
            </span>
          )}
          {xyl && (
            <span className="rounded-full bg-warning-light text-foreground border border-warning/40 px-2.5 py-1 text-xs font-semibold">
              Xylazine detected
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{where} · approximate</span>
        {when && <><span>·</span><span>{when}</span></>}
        <span>·</span>
        <span>{sourceName}</span>
      </div>
    </li>
  );
}
