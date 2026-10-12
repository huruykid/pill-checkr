import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/shared/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/hooks/useI18n";
import { Loader2, Printer } from "lucide-react";

type Row = {
  label: string | null;
  source: string;
  period: string;
  scans: number;
  first_checks: number;
  strips_logged: number;
  updated_through: string | null;
};

const PERIODS = ["7d", "30d", "all"] as const;

/**
 * Read-only totals for one outreach partner's ?c= code, opened from a secret
 * link an admin mints in Admin → Metrics. Only window totals from the nightly
 * rollup: no per-day series, no strip results, nothing about a person.
 */
export default function PartnerStats() {
  const { token } = useParams();
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      setRows([]);
      return;
    }
    supabase.rpc("partner_stats", { p_token: token }).then(({ data, error }) => {
      if (error) setFailed(true);
      setRows((data as Row[]) || []);
    });
  }, [token]);

  const first = rows?.[0];
  const byPeriod = new Map((rows || []).map((r) => [r.period, r]));

  return (
    <Layout>
      <SEOHead title="Partner stats | Stamped" description={t("partner.privacy")} path="/partner" noindex />
      <div className="container max-w-2xl py-10">
        {rows === null ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !first ? (
          <Card>
            <CardContent className="p-6 text-center">
              <h1 className="text-xl font-bold">{t("partner.notFoundTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{failed ? t("partner.error") : t("partner.notFound")}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h1 className="font-display text-4xl leading-tight">{first.label || first.source}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("partner.code")} <code className="rounded bg-muted px-1.5 py-0.5">{first.source}</code>
            </p>

            <Card className="mt-6">
              <CardContent className="overflow-x-auto p-4">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium" />
                      {PERIODS.map((p) => (
                        <th key={p} className="py-2 pr-4 text-right font-medium">{t(`partner.period.${p}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(["scans", "first_checks", "strips_logged"] as const).map((k) => (
                      <tr key={k} className="border-t">
                        <th scope="row" className="py-3 pr-4 text-left font-semibold">{t(`partner.metric.${k}`)}</th>
                        {PERIODS.map((p) => (
                          <td key={p} className="py-3 pr-4 text-right text-lg font-bold tabular-nums">
                            {byPeriod.get(p)?.[k] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("partner.updated").replace("{date}", first.updated_through ?? "—")}
                </p>
              </CardContent>
            </Card>

            <p className="mt-4 text-sm text-muted-foreground">{t("partner.privacy")}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild className="min-h-11 gap-2">
                <Link to={`/qr?c=${first.source}&layout=stickers`}>
                  <Printer className="h-4 w-4" />
                  {t("partner.printStickers")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11 gap-2">
                <Link to={`/qr?c=${first.source}&mode=test`}>
                  <Printer className="h-4 w-4" />
                  {t("partner.printPoster")}
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
