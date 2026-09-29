import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { History as HistoryIcon, Search, Trash2, AlertCircle, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";

type Report = Database["public"]["Tables"]["reports"]["Row"];

interface LocalHistoryItem {
  id: string;
  date: string;
  riskLevel: "low" | "medium" | "high";
  imprint: string | null;
  shape: string | null;
  color: string | null;
  anomalyScore?: number;
}

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [localHistory, setLocalHistory] = useState<LocalHistoryItem[]>([]);
  const [dbReports, setDbReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [testStripResults, setTestStripResults] = useState<Record<string, string>>({});

  useEffect(() => {
    loadHistory();
  }, [user, authLoading]);

  const loadHistory = async () => {
    setLoading(true);
    
    try {
      const stored = localStorage.getItem("pillCheckHistory");
      if (stored) setLocalHistory(JSON.parse(stored));
    } catch {}

    if (user) {
      try {
        const { data } = await supabase
          .from("reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        const reports = data || [];
        setDbReports(reports);

        const urlMap: Record<string, string> = {};
        await Promise.all(
          reports.filter(r => r.photo_url).map(async (r) => {
            if (r.photo_url!.startsWith("http")) {
              urlMap[r.id] = r.photo_url!;
            } else {
              const { data: signed } = await supabase.storage
                .from("pill-images")
                .createSignedUrl(r.photo_url!, 3600);
              if (signed?.signedUrl) urlMap[r.id] = signed.signedUrl;
            }
          })
        );
        setSignedUrls(urlMap);

        // Fetch test strip results for all reports
        const reportIds = reports.map(r => r.id);
        if (reportIds.length > 0) {
          const { data: strips } = await supabase
            .from("test_strip_results")
            .select("report_id, result")
            .in("report_id", reportIds);
          if (strips) {
            const stripMap: Record<string, string> = {};
            for (const s of strips) stripMap[s.report_id] = s.result;
            setTestStripResults(stripMap);
          }
        }
      } catch {}
    }

    setLoading(false);
  };

  const clearLocalHistory = () => {
    localStorage.removeItem("pillCheckHistory");
    setLocalHistory([]);
  };

  const removeLocalItem = (id: string) => {
    const updated = localHistory.filter((item) => item.id !== id);
    localStorage.setItem("pillCheckHistory", JSON.stringify(updated));
    setLocalHistory(updated);
  };

  const dbIds = new Set(dbReports.map((r) => r.id));
  const localOnlyItems = localHistory.filter((item) => !dbIds.has(item.id));

  return (
    <Layout>
      <SEOHead
        title="Your Check History | Stamped"
        description="View your past pill safety checks and analysis results. Track your history and revisit previous reports."
        path="/history"
        jsonLd={makeWebPage("Check History", "/history", "View past pill safety checks and analysis results.")}
      />
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">{t("history.title")}</h1>
              <p className="mt-1 text-muted-foreground font-sans normal-case">
                {user ? t("history.savedChecks") : t("history.previousChecks")}
              </p>
            </div>
            {localOnlyItems.length > 0 && !user && (
              <Button variant="outline" size="sm" onClick={clearLocalHistory}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("history.clearAll")}
              </Button>
            )}
          </div>

          {!user && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/50 p-4 text-sm">
              <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                {t("history.localNotice")}{" "}
                <Link to="/auth" className="text-primary hover:underline font-semibold">{t("history.syncPrompt")}</Link> {t("history.syncSuffix")}
              </p>
            </div>
          )}

          {loading || authLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          ) : dbReports.length === 0 && localOnlyItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HistoryIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">{t("history.empty")}</h3>
                <p className="mb-6 text-muted-foreground">
                  {t("history.emptyDesc")}
                </p>
                <Link to="/check">
                  <Button>
                    <Search className="mr-2 h-4 w-4" />
                    {t("nav.checkPill")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dbReports.map((report) => (
                <Card key={report.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <Link to={`/results/${report.id}`} className="flex items-center gap-4">
                      {signedUrls[report.id] && (
                        <img
                          src={signedUrls[report.id]}
                          alt="Pill"
                          className="h-14 w-14 rounded-lg object-cover bg-muted/30 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <RiskBadge level={(report.risk_level || "medium") as "low" | "medium" | "high"} size="sm" showIcon={false} />
                          <span className="font-medium text-foreground truncate">
                            {report.imprint_text || t("history.unableToMatch")}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                          {report.shape && <span>{report.shape}</span>}
                          {report.color && <span>• {report.color}</span>}
                          <span>• {format(new Date(report.created_at), "MMM d, yyyy")}</span>
                          {testStripResults[report.id] && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] gap-1 px-1.5 py-0",
                                testStripResults[report.id] === "positive"
                                  ? "border-danger/50 text-danger"
                                  : testStripResults[report.id] === "negative"
                                    ? "border-success/50 text-success"
                                    : "border-muted-foreground/50 text-muted-foreground"
                              )}
                            >
                              {testStripResults[report.id] === "positive" ? (
                                <><ShieldAlert className="h-3 w-3" />{t("testStrip.indicator.positive")}</>
                              ) : testStripResults[report.id] === "negative" ? (
                                <><ShieldCheck className="h-3 w-3" />{t("testStrip.indicator.negative")}</>
                              ) : "Invalid"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}

              {localOnlyItems.map((item) => (
                <Card key={item.id} className="overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <Link to={`/results/${item.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          <RiskBadge level={item.riskLevel} size="sm" showIcon={false} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {item.imprint || t("history.unableToMatch")}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              {item.shape && <span>{item.shape}</span>}
                              {item.color && <span>• {item.color}</span>}
                              {item.date && <span>• {format(new Date(item.date), "MMM d, yyyy")}</span>}
                            </div>
                          </div>
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLocalItem(item.id)}
                        className="shrink-0 text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
