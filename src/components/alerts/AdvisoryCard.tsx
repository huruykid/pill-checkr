import { ShieldCheck, ExternalLink, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

export interface OfficialAdvisory {
  id: string;
  title: string;
  summary: string | null;
  issuer: string;
  source_url: string;
  state: string;
  city: string | null;
  drug_name: string | null;
  imprint: string | null;
  published_on: string;
}

/**
 * Visually distinct from community AlertCards: solid border, issuer badge,
 * a source link, and no strip chip. These are not community reports and
 * the community disclaimer does not apply to them.
 */
export function AdvisoryCard({ a, className }: { a: OfficialAdvisory; className?: string }) {
  const { t, lang } = useI18n();
  const where = [a.city, a.state].filter(Boolean).join(", ");
  const date = new Date(`${a.published_on}T00:00:00`).toLocaleDateString(lang, { year: "numeric", month: "short", day: "numeric" });
  return (
    <li className={cn("rounded-xl border-2 border-foreground/80 bg-card p-4 md:p-5", className)}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-background">
            {a.issuer}
          </span>
          <p className="mt-2 font-semibold leading-snug">{a.title}</p>
          {a.summary && <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>}
          {(a.imprint || a.drug_name) && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {[a.imprint ? `“${a.imprint}”` : null, a.drug_name].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {where && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{where}</span>}
            <span>{t("alerts.officialIssued")} {date}</span>
            <a
              href={a.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[32px] items-center gap-1 font-medium text-primary underline underline-offset-4"
            >
              {t("alerts.officialSource")} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}
