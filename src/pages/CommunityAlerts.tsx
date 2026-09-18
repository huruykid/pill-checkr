import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { AlertCard, type CommunityAlert } from "@/components/alerts/AlertCard";
import { AdvisoryCard, type OfficialAdvisory } from "@/components/alerts/AdvisoryCard";
import { ReportFoundSheet } from "@/components/alerts/ReportFoundSheet";
import { detectWithToast, getSavedLocation, saveLocation, type CityState } from "@/lib/location";
import { isNative } from "@/lib/platform";
import { track } from "@/lib/analytics";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { Radio, LocateFixed, Loader2, Plus, X, FlaskConical, BarChart3, ShieldCheck } from "lucide-react";

type Scope = "near" | "all";
const PAGE = 50;

export default function CommunityAlerts() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [advisories, setAdvisories] = useState<OfficialAdvisory[]>([]);
  // When "near" has no community reports we still show everywhere, but say so
  // and keep the near chip selected so the person's location intent survives.
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loc, setLoc] = useState<CityState | null>(() => getSavedLocation());
  const [scope, setScope] = useState<Scope>(() => (getSavedLocation() ? "near" : "all"));
  const [geo, setGeo] = useState(false);
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const near = scope === "near" && !!loc?.state;

    const community = (nearOnly: boolean) => {
      let q = supabase
        .from("counterfeit_reports_public")
        .select("id, drug_name, imprint, strip_result, risk_level, city, state, created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (nearOnly && loc?.state) q = q.ilike("state", loc.state);
      return q;
    };
    const official = (nearOnly: boolean) => {
      let q = supabase
        .from("official_advisories_public")
        .select("*")
        .order("published_on", { ascending: false })
        .limit(nearOnly ? 10 : 5);
      if (nearOnly && loc?.state) q = q.ilike("state", loc.state);
      return q;
    };

    const [{ data, error }, { data: adv, error: advError }] = await Promise.all([community(near), official(near)]);
    if (error) console.error(error);
    if (advError) console.error(advError);
    let rows = (data as CommunityAlert[]) || [];
    let usedFallback = false;
    if (near && rows.length === 0) {
      const { data: all } = await community(false);
      rows = (all as CommunityAlert[]) || [];
      usedFallback = true;
    }
    setAlerts(rows);
    setAdvisories((adv as OfficialAdvisory[]) || []);
    setFallback(usedFallback);
    setLoading(false);
    if (near) {
      track("alerts_viewed_near", {
        count_bucket: usedFallback ? "0" : rows.length <= 5 ? "1-5" : "6+",
        fallback: usedFallback,
        advisories: (adv || []).length,
      });
    }
  }, [scope, loc?.state]);

  useEffect(() => { load(); }, [load]);

  const locate = async () => {
    setGeo(true);
    const l = await detectWithToast();
    if (l) { setLoc(l); setScope("near"); }
    setGeo(false);
  };

  const clearLoc = () => { saveLocation(null); setLoc(null); setScope("all"); };

  // Same city floats to the top within the state; everything stays time-sorted otherwise.
  const sorted = useMemo(() => {
    if (scope !== "near" || !loc?.city || fallback) return alerts;
    const c = loc.city.toLowerCase();
    return [...alerts].sort((a, b) => {
      const ac = (a.city || "").toLowerCase() === c ? 0 : 1;
      const bc = (b.city || "").toLowerCase() === c ? 0 : 1;
      return ac - bc;
    });
  }, [alerts, scope, loc?.city, fallback]);

  const positives7d = useMemo(() => {
    if (fallback) return 0;
    const cutoff = Date.now() - 7 * 864e5;
    return alerts.filter((a) => a.strip_result === "positive" && new Date(a.created_at).getTime() > cutoff).length;
  }, [alerts, fallback]);

  const nearLabel = loc ? (loc.city || loc.state) : t("alerts.nearMe");
  const stateLabel = loc?.state || "";

  return (
    <Layout>
      <SEOHead
        title="Community Alerts | Pill Checkr"
        description="See what counterfeit pills and fentanyl-positive test strips are being reported near you. Anonymous, city-level, community-sourced."
        path="/trends"
        jsonLd={makeWebPage("Community Alerts", "/trends", "Anonymous community reports of counterfeit pills and fentanyl test strip results by city.")}
      />

      <div className="container max-w-2xl py-5 md:py-10">
        {/* Header row */}
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl flex items-center gap-2">
              <Radio className="h-7 w-7 text-primary" />
              {t("alerts.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? t("alerts.loading")
                : positives7d > 0
                  ? t("alerts.positives7d")
                      .replace("{n}", String(positives7d))
                      .replace("{strips}", t(positives7d === 1 ? "alerts.strip" : "alerts.strips"))
                  : t("alerts.subtitle")}
            </p>
          </div>
          {!isNative() && (
            <Link to="/analytics" className="hidden md:block">
              <Button variant="ghost" size="sm" className="gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</Button>
            </Link>
          )}
        </div>

        {/* Scope chips */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={loc ? () => setScope("near") : locate}
            className={cn(
              "flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap",
              scope === "near" ? "bg-foreground text-background border-foreground" : "bg-card border-border",
            )}
          >
            {geo ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            {nearLabel}
          </button>
          <button
            type="button"
            onClick={() => setScope("all")}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-sm font-medium whitespace-nowrap",
              scope === "all" ? "bg-foreground text-background border-foreground" : "bg-card border-border",
            )}
          >
            {t("alerts.everywhere")}
          </button>
          {loc && (
            <button type="button" onClick={clearLoc} aria-label={t("alerts.clearLocation")}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {loading ? (
          <ul className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </ul>
        ) : (
          <>
            {/* Official advisories: visually distinct, always above the community list. */}
            {advisories.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t("alerts.officialTitle")}
                </h2>
                <ul className="space-y-3">
                  {advisories.map((a) => <AdvisoryCard key={a.id} a={a} />)}
                </ul>
              </section>
            )}

            {fallback && (
              <p className="mb-3 rounded-lg border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {t("alerts.fallbackNotice").replace("{state}", stateLabel)}
              </p>
            )}

            {sorted.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <FlaskConical className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-semibold">
                  {scope === "near" && !fallback
                    ? t("alerts.emptyNear").replace("{state}", stateLabel || t("alerts.nearMe"))
                    : t("alerts.emptyAll")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{t("alerts.emptyCta")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {sorted.map((a) => (
                  <AlertCard
                    key={a.id}
                    a={a}
                    highlight={scope === "near" && !fallback && !!loc?.city && (a.city || "").toLowerCase() === loc.city.toLowerCase()}
                  />
                ))}
              </ul>
            )}

            {fallback && (
              <p className="mt-3 text-center text-sm text-muted-foreground">{t("alerts.emptyCta")}</p>
            )}
          </>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">{t("alerts.disclaimer")}</p>
      </div>

      {/* Primary action: report. Sits above the tab bar. */}
      <div
        className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
        style={{ bottom: "calc(var(--tab-bar-space, 56px) + env(safe-area-inset-bottom) + 12px)" }}
      >
        <Button size="lg" className="pointer-events-auto gap-2 shadow-lg rounded-full px-6 min-h-[48px]" onClick={() => setSheet(true)}>
          <Plus className="h-5 w-5" />
          {t("alerts.reportFab")}
        </Button>
      </div>

      <ReportFoundSheet open={sheet} onOpenChange={setSheet} defaultLocation={loc} onSubmitted={load} />
    </Layout>
  );
}
