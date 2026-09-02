import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchExternalAlerts, type ExternalAlert } from "@/lib/externalData";
import { cn } from "@/lib/utils";
import { ChevronRight, ExternalLink, FileText, Siren } from "lucide-react";

// National early-warning strip above the Alerts feed. Shows the newest notice
// from a forensic early-warning program (CFSRE NPS Discovery) and opens a sheet
// with the full list. Every card names its source and links to the original
// document — we never paraphrase a lab's warning without a way to read it.

function fmtDate(d: string | null): string | null {
  if (!d || isNaN(new Date(d + "T00:00:00").getTime())) return null;
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isRecent(d: string | null, days: number): boolean {
  if (!d) return false;
  const t = new Date(d + "T00:00:00").getTime();
  return !isNaN(t) && Date.now() - t < days * 864e5;
}

function SubstanceChips({ a, max }: { a: ExternalAlert; max: number }) {
  const subs = Array.isArray(a.substances) ? a.substances.filter((s) => typeof s === "string" && s) : [];
  if (subs.length === 0) return null;
  const shown = subs.slice(0, max);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <span
          key={s}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            a.severity === "danger"
              ? "bg-danger text-danger-foreground"
              : "bg-warning-light text-foreground border border-warning/40",
          )}
        >
          {s}
        </span>
      ))}
      {subs.length > shown.length && (
        <span className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          +{subs.length - shown.length}
        </span>
      )}
    </div>
  );
}

function AlertDetail({ a, sourceName }: { a: ExternalAlert; sourceName: string }) {
  const when = fmtDate(a.published_on);
  const doc = a.pdf_url || a.url;
  return (
    <li className={cn(
      "rounded-xl border bg-card p-4",
      a.severity === "danger" ? "border-l-4 border-l-danger border-danger/30" : "border-l-4 border-l-warning border-border",
    )}>
      <div className="flex items-start gap-3">
        {typeof a.image_url === "string" && a.image_url.startsWith("https://") && (
          <img
            src={a.image_url}
            alt=""
            loading="lazy"
            className="h-16 w-12 shrink-0 rounded border object-cover object-top"
            onError={(e) => { (e.target as HTMLImageElement).hidden = true; }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{[when, a.region].filter(Boolean).join(" · ")}</p>
          <p className="mt-0.5 font-semibold leading-snug">{a.title}</p>
        </div>
      </div>
      <SubstanceChips a={a} max={6} />
      {a.summary && <p className="mt-2 text-sm text-muted-foreground">{a.summary}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{sourceName}</span>
        {doc && doc.startsWith("https://") && (
          <a
            href={doc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary"
          >
            <FileText className="h-4 w-4" />
            Read the original alert
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </li>
  );
}

export function EarlyWarningStrip({ sourceNames }: { sourceNames: Record<string, string> }) {
  const [alerts, setAlerts] = useState<ExternalAlert[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let on = true;
    fetchExternalAlerts(40).then((a) => { if (on) setAlerts(a); });
    return () => { on = false; };
  }, []);

  if (alerts === null) return <Skeleton className="mb-4 h-[104px] rounded-xl" />; // reserve space: no layout jump
  if (alerts.length === 0) return null; // nothing to warn about, take no space
  const latest = alerts[0];
  const when = fmtDate(latest.published_on);
  const fresh = isRecent(latest.published_on, 45);
  const name = (id: string) => sourceNames[id] || "Early-warning program";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Early warning: ${latest.title}. Open all ${alerts.length} alerts`}
        className={cn(
          "mb-4 w-full rounded-xl border bg-card p-4 text-left transition-colors active:bg-muted",
          latest.severity === "danger" ? "border-l-4 border-l-danger border-danger/30" : "border-l-4 border-l-warning",
        )}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <Siren className={cn("h-4 w-4", latest.severity === "danger" ? "text-danger" : "text-warning")} />
          <span>Early warning</span>
          {fresh && <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] text-danger-foreground normal-case tracking-normal">New</span>}
          <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground">{when}</span>
        </div>
        <p className="mt-1.5 font-display text-lg leading-tight line-clamp-2">{latest.title}</p>
        <SubstanceChips a={latest} max={3} />
        <div className="mt-2.5 flex items-center text-xs text-muted-foreground">
          <span className="truncate">{name(latest.source_id)}</span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 font-medium text-foreground">
            All {alerts.length} alerts <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-2xl">Early warnings</SheetTitle>
            <SheetDescription>
              National notices from forensic labs about new substances showing up in the drug supply.
              These describe trends, not a specific pill — nothing here can tell you a pill is safe.
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-4 space-y-3">
            {alerts.map((a) => <AlertDetail key={a.id} a={a} sourceName={name(a.source_id)} />)}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
