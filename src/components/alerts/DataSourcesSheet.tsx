import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fetchExternalSources, type ExternalSource } from "@/lib/externalData";
import { ExternalLink, ShieldCheck, Users } from "lucide-react";

// "Where does this data come from?" - plain-language provenance for every layer
// of the Alerts feed. Every external source shows its name, org, description,
// link, and required attribution line. Trust is a feature.
export function DataSourcesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [sources, setSources] = useState<ExternalSource[]>([]);

  useEffect(() => {
    if (open && sources.length === 0) fetchExternalSources().then(setSources);
  }, [open, sources.length]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">Where this data comes from</SheetTitle>
          <SheetDescription>
            Alerts mix two kinds of information. You can always tell them apart by the badge on each card.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <Users className="h-4 w-4 text-secondary-foreground" />
              </span>
              <p className="font-semibold">Community reports</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Anonymous reports from people using this app, at city level only. They are
              unverified - treat them as a heads-up, not a lab result.
            </p>
          </div>

          {sources.map((s) => (
            <div key={s.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
                  <ShieldCheck className="h-4 w-4 text-background" />
                </span>
                <p className="font-semibold">{s.name}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{s.attribution_text}</span>
                {s.last_synced_at && !isNaN(new Date(s.last_synced_at).getTime()) && (
                  <><span>·</span><span>updated {new Date(s.last_synced_at).toLocaleDateString()}</span></>
                )}
              </div>
              <a
                href={s.homepage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary"
              >
                Visit {s.organization}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            Lab results describe individual samples, not every pill in an area. No data here
            can prove a pill is safe - when in doubt, test with a fentanyl strip.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
