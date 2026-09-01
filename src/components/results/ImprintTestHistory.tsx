import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FlaskConical } from "lucide-react";

// Local test history for THIS imprint — danger-forward by design.
// Positives lead; negatives are context only and always carry the
// non-transferability line. There is deliberately no "similar pills tested
// clean" framing anywhere: fentanyl content varies pill to pill, even within
// one batch, so a past negative never blesses the pill in the user's hand.
interface Counts {
  positive: number;
  negative: number;
  untested: number;
}

export function ImprintTestHistory({ imprint, className }: { imprint: string | null; className?: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    const q = (imprint ?? "").trim();
    if (!q) return;
    let on = true;
    const cutoff = new Date(Date.now() - 90 * 864e5).toISOString();
    supabase
      .from("counterfeit_reports_public")
      .select("strip_result")
      .ilike("imprint", q)
      .gte("created_at", cutoff)
      .limit(500)
      .then(({ data, error }) => {
        if (!on || error || !data) return;
        const c: Counts = { positive: 0, negative: 0, untested: 0 };
        for (const r of data) {
          const s = typeof r.strip_result === "string" ? r.strip_result : "";
          if (s === "positive") c.positive++;
          else if (s === "negative") c.negative++;
          else c.untested++;
        }
        setCounts(c);
      });
    return () => { on = false; };
  }, [imprint]);

  if (!counts) return null;
  const total = counts.positive + counts.negative + counts.untested;
  if (total === 0) return null;

  return (
    <Card className={cn("border-2", counts.positive > 0 ? "border-danger/50 bg-danger/5" : "border-border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className={cn("h-5 w-5", counts.positive > 0 ? "text-danger" : "text-muted-foreground")} />
          Test results for this imprint
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {total} community {total === 1 ? "report" : "reports"} for “{(imprint ?? "").trim()}” in the last 90 days
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {counts.positive > 0 && (
            <span className="rounded-full bg-danger text-danger-foreground px-3 py-1.5 text-sm font-semibold">
              {counts.positive} fentanyl-positive
            </span>
          )}
          {counts.negative > 0 && (
            <span className="rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium">
              {counts.negative} strip-negative
            </span>
          )}
          {counts.untested > 0 && (
            <span className="rounded-full bg-warning-light text-foreground border border-warning/40 px-3 py-1.5 text-sm font-medium">
              {counts.untested} untested
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          A negative strip never transfers to your pill — fentanyl content varies pill to pill,
          even within one batch. The only result that counts is a strip on this one.
        </p>
      </CardContent>
    </Card>
  );
}
