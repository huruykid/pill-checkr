import { cn } from "@/lib/utils";
import { FlaskConical, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export interface CommunityAlert {
  id: string;
  drug_name: string | null;
  imprint: string | null;
  strip_result: "positive" | "negative" | "not_tested" | string | null;
  risk_level: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

/** Relative time in the user's language; `t` from useI18n. */
export function timeAgo(iso: string, t: (k: string) => string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return t("alerts.time.minutes").replace("{n}", String(Math.max(1, Math.floor(s / 60))));
  if (s < 86400) return t("alerts.time.hours").replace("{n}", String(Math.floor(s / 3600)));
  const d = Math.floor(s / 86400);
  return d === 1 ? t("alerts.time.yesterday") : t("alerts.time.days").replace("{n}", String(d));
}

const STRIP: Record<string, { key: string; cls: string }> = {
  positive: { key: "alerts.card.detected", cls: "bg-danger text-danger-foreground" },
  negative: { key: "alerts.card.negative", cls: "bg-muted text-foreground" },
  not_tested: { key: "alerts.card.untested", cls: "bg-warning-light text-foreground border border-warning/40" },
};

export function AlertCard({ a, highlight }: { a: CommunityAlert; highlight?: boolean }) {
  const { t } = useI18n();
  const strip = STRIP[a.strip_result || "not_tested"] || STRIP.not_tested;
  const title = a.imprint ? `“${a.imprint}”` : a.drug_name || t("alerts.card.unknownPill");
  const where = [a.city, a.state].filter(Boolean).join(", ") || t("alerts.card.noLocation");
  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-4 md:p-5",
        a.strip_result === "positive" ? "border-l-4 border-l-danger border-danger/30" : "border-border",
        highlight && "ring-1 ring-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight truncate">{title}</p>
          {a.imprint && a.drug_name && (
            <p className="text-sm text-muted-foreground truncate">{t("alerts.card.stampedAs").replace("{drug}", a.drug_name)}</p>
          )}
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1", strip.cls)}>
          <FlaskConical className="h-3 w-3" />
          {t(strip.key)}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{where}</span>
        <span>·</span>
        <span>{timeAgo(a.created_at, t)}</span>
      </div>
    </li>
  );
}
