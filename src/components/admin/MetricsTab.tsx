import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Daily = Database["public"]["Tables"]["app_events_daily"]["Row"];
type Funnel = Database["public"]["Views"]["activation_funnel_30d"]["Row"];
type Retention = Database["public"]["Views"]["retention_d7"]["Row"];

const DAYS = 14;
const EVENT_ORDER = [
  "first_check", "verdict_viewed", "strip_logged", "report_posted", "share_tapped",
  "alerts_viewed_near", "help_map_opened", "qr_landing", "store_badge_tapped", "push_opted_in", "review_prompted",
];

function pct(n: number | null | undefined, d: number | null | undefined) {
  if (!d) return "–";
  return `${Math.round(((n || 0) / d) * 100)}%`;
}

/**
 * Read surface for the first-party events table. Tables only: the point is
 * to answer "is the loop working and where" every week, not to look pretty.
 */
export function MetricsTab() {
  const [daily, setDaily] = useState<Daily[]>([]);
  const [funnel, setFunnel] = useState<Funnel[]>([]);
  const [retention, setRetention] = useState<Retention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - DAYS * 864e5).toISOString().slice(0, 10);
      const [d, f, r] = await Promise.all([
        supabase.from("app_events_daily").select("*").gte("day", since),
        supabase.from("activation_funnel_30d").select("*"),
        supabase.from("retention_d7").select("*").limit(30),
      ]);
      const err = d.error || f.error || r.error;
      if (err) setError(err.message);
      setDaily(d.data || []);
      setFunnel(f.data || []);
      setRetention(r.data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Totals by event and platform over the window.
  const byEvent = new Map<string, { web: number; ios: number; installs: number }>();
  for (const row of daily) {
    const cur = byEvent.get(row.event) || { web: 0, ios: 0, installs: 0 };
    if (row.platform === "ios") cur.ios += row.events; else cur.web += row.events;
    cur.installs += row.installs;
    byEvent.set(row.event, cur);
  }
  // Installs by source over the window (first_check as the "activated install" proxy).
  const bySource = new Map<string, number>();
  for (const row of daily) {
    if (row.event !== "first_check") continue;
    const k = row.source || "(direct)";
    bySource.set(k, (bySource.get(k) || 0) + row.installs);
  }
  // Empty-feed share: alerts_viewed_near with count_bucket "0" is only in raw props,
  // so the daily table can't split it; we show total near-views instead.

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm">
          {error}. If the tables are missing, run migration 20260918100000_app_events.sql.
        </p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Activation funnel, last 30 days (per install)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-1 pr-4">Platform</th><th className="pr-4">Installs seen</th><th className="pr-4">First check</th><th className="pr-4">Strip logged</th><th className="pr-4">Report posted</th><th>Shared</th></tr>
            </thead>
            <tbody>
              {funnel.length === 0 && <tr><td colSpan={6} className="py-3 text-muted-foreground">No events yet.</td></tr>}
              {funnel.map((f) => (
                <tr key={f.platform} className="border-t">
                  <td className="py-1.5 pr-4 font-medium">{f.platform}</td>
                  <td className="pr-4 tabular-nums">{f.installs_seen}</td>
                  <td className="pr-4 tabular-nums">{f.first_check} <span className="text-muted-foreground">({pct(f.first_check, f.installs_seen)})</span></td>
                  <td className="pr-4 tabular-nums">{f.strip_logged} <span className="text-muted-foreground">({pct(f.strip_logged, f.first_check)})</span></td>
                  <td className="pr-4 tabular-nums">{f.report_posted} <span className="text-muted-foreground">({pct(f.report_posted, f.strip_logged)})</span></td>
                  <td className="tabular-nums">{f.share_tapped} <span className="text-muted-foreground">({pct(f.share_tapped, f.first_check)})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Percentages are of the previous column: strip logged / first check, report posted / strip logged.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Events, last {DAYS} days (from the nightly rollup)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-1 pr-4">Event</th><th className="pr-4">iOS</th><th className="pr-4">Web</th><th>Install-days</th></tr>
            </thead>
            <tbody>
              {EVENT_ORDER.filter((e) => byEvent.has(e)).map((e) => {
                const v = byEvent.get(e)!;
                return (
                  <tr key={e} className="border-t">
                    <td className="py-1.5 pr-4 font-mono text-xs">{e}</td>
                    <td className="pr-4 tabular-nums">{v.ios}</td>
                    <td className="pr-4 tabular-nums">{v.web}</td>
                    <td className="tabular-nums">{v.installs}</td>
                  </tr>
                );
              })}
              {byEvent.size === 0 && <tr><td colSpan={4} className="py-3 text-muted-foreground">Rollup has not run yet (nightly at 04:00 UTC).</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Activated installs by source, last {DAYS} days</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1 pr-4">Source (?c= or utm_source)</th><th>First checks</th></tr></thead>
            <tbody>
              {[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <tr key={k} className="border-t"><td className="py-1.5 pr-4 font-mono text-xs">{k}</td><td className="tabular-nums">{v}</td></tr>
              ))}
              {bySource.size === 0 && <tr><td colSpan={2} className="py-3 text-muted-foreground">Nothing yet. Each printed poster should carry its own code.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Week-one retention by cohort day</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1 pr-4">Cohort</th><th className="pr-4">Platform</th><th className="pr-4">Installs</th><th>Back on day 6–8</th></tr></thead>
            <tbody>
              {retention.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5 pr-4 tabular-nums">{r.cohort_day}</td>
                  <td className="pr-4">{r.platform}</td>
                  <td className="pr-4 tabular-nums">{r.installs}</td>
                  <td className="tabular-nums">{r.returned_d7} <span className="text-muted-foreground">({pct(r.returned_d7, r.installs)})</span></td>
                </tr>
              ))}
              {retention.length === 0 && <tr><td colSpan={4} className="py-3 text-muted-foreground">Needs at least 8 days of data.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
