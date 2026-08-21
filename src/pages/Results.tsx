import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { CounterfeitWarning } from "@/components/shared/CounterfeitWarning";
import { HarmReductionResources } from "@/components/shared/HarmReductionResources";
import { DrugInfoCard } from "@/components/results/DrugInfoCard";
import { InteractionChecker } from "@/components/results/InteractionChecker";
import { EmergencyBar } from "@/components/results/EmergencyBar";
import { BuddyAlert } from "@/components/results/BuddyAlert";
import { MatchFeedback } from "@/components/results/MatchFeedback";
import { ReportPill } from "@/components/results/ReportPill";
import { TestStripLogger } from "@/components/results/TestStripLogger";
import { RegionalCounterfeitAlert } from "@/components/results/RegionalCounterfeitAlert";
import { NearbyHelp } from "@/components/shared/NearbyHelp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { SafetyThresholdModal } from "@/components/results/SafetyThresholdModal";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RotateCcw,
  Save,
  Pill,
  ImageOff,
  Loader2,
  Info,
  ShieldAlert,
  Eye,
  ImageIcon,
  MapPin,
  Share2,
  Link2,
  LinkIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type Report = Database["public"]["Tables"]["reports"]["Row"];
type Match = Database["public"]["Tables"]["matches"]["Row"];

interface ResultsData {
  report: Report;
  matches: Match[];
}

interface VisualSimilarityData {
  hasComparison: boolean;
  score: number | null;
  flags: string[];
}

function parseVisualSimilarity(matchReasons: string | null): VisualSimilarityData {
  if (!matchReasons) return { hasComparison: false, score: null, flags: [] };
  const scoreMatch = matchReasons.match(/Visual similarity:\s*(\d+)%/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  const flagsMatch = matchReasons.match(/Visual flags?:\s*([^.]+)/i);
  const flags = flagsMatch 
    ? flagsMatch[1].split(',').map(f => f.trim()).filter(Boolean)
    : [];
  return { hasComparison: score !== null, score, flags };
}

function getVisualScoreColor(score: number): string {
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-warning";
  return "bg-danger";
}

function getVisualScoreText(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-danger";
}

const harmReductionStepKeys = ["steps.1", "steps.2", "steps.3", "steps.4", "steps.5", "steps.6"];

export default function Results() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [counterfeitAlerts, setCounterfeitAlerts] = useState<Array<{ drug_name: string; state: string; city: string | null; risk_level: string | null; count: number; latest: string }>>([]);

  const hasCounterfeitRisk = useMemo(() => {
    return data?.matches.some(
      (match) => match.explanation?.toUpperCase().includes("HIGH COUNTERFEIT RISK")
    ) ?? false;
  }, [data?.matches]);

  useEffect(() => {
    if (reportId) fetchResults();
  }, [reportId]);

  const fetchResults = async () => {
    try {
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();

      if (reportError) throw reportError;
      if (!report) {
        toast.error("Report not found");
        navigate("/check");
        return;
      }

      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("report_id", reportId)
        .order("rank", { ascending: true });

      if (matchesError) throw matchesError;
      setData({ report, matches: matches || [] });

      // Show safety modal if not yet dismissed for this report
      const modalKey = `pc_safety_modal_${reportId}`;
      if (!localStorage.getItem(modalKey)) {
        setSafetyModalOpen(true);
      }

      // Fetch regional counterfeit alerts for matched drug names
      if (matches && matches.length > 0) {
        const drugNames = [...new Set(matches.map(m => m.drug_name))];
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const { data: cfReports } = await supabase
          .from("counterfeit_reports_public")
          .select("drug_name, state, city, risk_level, created_at")
          .gte("created_at", ninetyDaysAgo)
          .in("drug_name", drugNames)
          .limit(100);

        if (cfReports && cfReports.length > 0) {
          const grouped: Record<string, { drug_name: string; state: string; city: string | null; risk_level: string | null; count: number; latest: string }> = {};
          for (const r of cfReports) {
            const key = `${r.drug_name}|${r.state || "unknown"}`;
            if (!grouped[key]) {
              grouped[key] = { drug_name: r.drug_name || "", state: r.state || "Unknown", city: r.city, risk_level: r.risk_level, count: 0, latest: r.created_at };
            }
            grouped[key].count++;
            if (r.created_at > grouped[key].latest) {
              grouped[key].latest = r.created_at;
              if (r.city) grouped[key].city = r.city;
              if (r.risk_level === "high") grouped[key].risk_level = "high";
            }
          }
          setCounterfeitAlerts(Object.values(grouped).sort((a, b) => b.count - a.count));
        }
      }

      // Generate signed URL for pill photo if stored as a file path
      if (report.photo_url) {
        if (report.photo_url.startsWith("http")) {
          // Legacy public URL — use as-is
          setSignedPhotoUrl(report.photo_url);
        } else {
          const { data: signedData } = await supabase.storage
            .from("pill-images")
            .createSignedUrl(report.photo_url, 3600);
          setSignedPhotoUrl(signedData?.signedUrl || null);
        }
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!data?.report) return;
    setSaving(true);
    try {
      if (user) {
        await supabase
          .from("reports")
          .update({ user_id: user.id })
          .eq("id", data.report.id);
        toast.success("Saved to your account history");
      } else {
        const history = JSON.parse(localStorage.getItem("pillCheckHistory") || "[]");
        history.unshift({
          id: data.report.id,
          date: data.report.created_at,
          riskLevel: data.report.risk_level,
          imprint: data.report.imprint_text,
          shape: data.report.shape,
          color: data.report.color,
        });
        localStorage.setItem("pillCheckHistory", JSON.stringify(history.slice(0, 50)));
        toast.success("Saved to local history");
      }
    } catch (error) {
      console.error("Error saving to history:", error);
      toast.error("Failed to save to history");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container flex min-h-[50vh] items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{t("common.loadingResults")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">{t("common.noResults")}</p>
          <Link to="/check">
            <Button className="mt-4">{t("results.checkAnother")}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const { report, matches } = data;
  const riskLevel = (report.risk_level || "medium") as "low" | "medium" | "high";
  const anomalyReasons = report.anomaly_reasons ?? [];
  const riskReasons = report.risk_reasons ?? [];


  return (
    <Layout urgentEmergency={riskLevel === "high"}>
      <SEOHead
        title="Pill Analysis Results | Pill Checkr"
        description="View your pill analysis results including visual matching, consistency scoring, and harm reduction guidance."
        path={`/results/${reportId}`}
        jsonLd={makeWebPage("Pill Analysis Results", `/results/${reportId}`, "Pill analysis results with visual matching and safety guidance.")}
      />
      <SafetyThresholdModal
        open={safetyModalOpen}
        onDismiss={() => {
          setSafetyModalOpen(false);
          localStorage.setItem(`pc_safety_modal_${reportId}`, "1");
        }}
      />
      <div className={cn("container py-8 md:py-12 transition-all duration-300", safetyModalOpen && "blur-xl pointer-events-none select-none")}>
        <div className="mx-auto max-w-3xl">
          <Link to="/check" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("results.backToCheck")}
          </Link>

          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">{t("results.title")}</h1>
            <RiskBadge level={riskLevel} size="lg" />
          </div>

          {/* Plain-language risk summary */}
          {(() => {
            const topDrug = matches.length > 0 ? matches[0].drug_name : null;
            // MVP: never render a "looks legit" state. Visual matching cannot detect fentanyl.
            const isUnidentified = matches.length === 0;

            const config = isUnidentified
              ? {
                  icon: <AlertTriangle className="h-6 w-6 text-danger shrink-0 mt-0.5" />,
                  border: "border-l-danger",
                  bg: "bg-danger-light",
                  message: t("results.summary.highRiskNone"),
                }
              : {
                  icon: <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />,
                  border: "border-l-warning",
                  bg: "bg-warning-light",
                  message: t("results.summary.identified").replace("{drug}", topDrug || ""),
                };

            return (
              <div className={cn("mb-6 rounded-xl border-l-4 p-4 md:p-5", config.border, config.bg)}>
                <div className="flex items-start gap-3">
                  {config.icon}
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-foreground leading-snug">{config.message}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      This is not lab testing. Always use fentanyl test strips.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Emergency Bar for high-risk results */}
          {riskLevel === "high" && <EmergencyBar className="mb-6" />}

          {/* Narcan locator CTA for high-risk or unmatched pills */}
          {(riskLevel === "high" || matches.length === 0) && (
            <div className="mb-6 rounded-xl border-2 border-danger/30 bg-danger/5 p-4 md:p-5">
              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-danger shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h3 className="text-base font-semibold text-foreground">{t("results.narcan.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("results.narcan.description")}</p>
                  <Button asChild variant="danger" size="sm">
                    <Link to="/nearby-help?filter=naloxone">
                      <MapPin className="h-4 w-4 mr-1" />
                      {t("results.narcan.button")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Show pill photo if available */}
          {signedPhotoUrl && (
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={signedPhotoUrl}
                  alt="Uploaded pill"
                  className="w-full max-h-[250px] object-contain bg-muted/30"
                />
              </CardContent>
            </Card>
          )}

          {riskLevel === "high" && (
            <Disclaimer variant="emergency" className="mb-8" />
          )}

          {/* Section A: Possible Matches */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                {t("results.possibleMatches")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="py-6 text-center">
                  <XCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                   <p className="text-muted-foreground font-medium">{t("results.noMatch")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("results.noMatchDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <div key={match.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent shrink-0">
                            <Pill className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{match.drug_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Imprint: {match.matched_imprint || "Unknown"} • 
                              {match.matched_shape && ` ${match.matched_shape}`}
                              {match.matched_color && ` • ${match.matched_color}`}
                            </p>
                            {/* Detected Logos */}
                            {report.detected_logos && Array.isArray(report.detected_logos) && (report.detected_logos as any[]).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {(report.detected_logos as any[]).map((logo: any, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs gap-1">
                                    🏷️ {logo.name}
                                    {logo.confidence === "high" && <CheckCircle className="h-3 w-3 text-success" />}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {match.match_reasons && (
                              <p className="mt-1 text-sm text-primary/80">{match.match_reasons}</p>
                            )}
                            {match.explanation && (
                              <p className="mt-2 text-sm text-muted-foreground">{match.explanation}</p>
                            )}
                            
                            {/* Visual Similarity Indicator */}
                            {(() => {
                              const visualData = parseVisualSimilarity(match.match_reasons);
                              return (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  {visualData.hasComparison && visualData.score !== null ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Visual Comparison</span>
                                        <div className="flex-1 max-w-[120px]">
                                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                            <div 
                                              className={`h-full transition-all ${getVisualScoreColor(visualData.score)}`}
                                              style={{ width: `${visualData.score}%` }}
                                            />
                                          </div>
                                        </div>
                                        <span className={`text-xs font-medium ${getVisualScoreText(visualData.score)}`}>
                                          {visualData.score}%
                                        </span>
                                        <CheckCircle className="h-3.5 w-3.5 text-success" />
                                      </div>
                                      {visualData.flags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 ml-6">
                                          {visualData.flags.map((flag, idx) => (
                                            <Badge 
                                              key={idx} 
                                              variant="warning" 
                                              className="text-[10px] px-1.5 py-0"
                                            >
                                              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                              {flag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <ImageIcon className="h-4 w-4" />
                                      <span className="text-xs">{t("results.noRefImage")}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Counterfeit Warning */}
          {hasCounterfeitRisk && <CounterfeitWarning className="mb-6" />}

          {/* Regional Counterfeit Alerts */}
          {counterfeitAlerts.length > 0 && (
            <RegionalCounterfeitAlert alerts={counterfeitAlerts} className="mb-6" />
          )}

          {/* Section B: What this check can and cannot tell you (categorical, no scores) */}
          <Card className="mb-6 border-warning/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-warning" />
                {t("results.verdictTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-warning-light border border-warning/30 p-4">
                <p className="font-semibold text-foreground">
                  {matches.length > 0
                    ? t("results.verdict.identified").replace("{drug}", matches[0].drug_name || "")
                    : t("results.verdict.unidentified")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t("results.verdict.why")}</p>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-danger shrink-0" />
                  <span className="text-muted-foreground">{t("results.verdict.step1")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-danger shrink-0" />
                  <span className="text-muted-foreground">{t("results.verdict.step2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-danger shrink-0" />
                  <span className="text-muted-foreground">{t("results.verdict.step3")}</span>
                </li>
              </ul>

              {anomalyReasons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t("results.consistencyNotes")}</p>
                  <ul className="space-y-2">
                    {anomalyReasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-warning shrink-0" />
                        <span className="text-muted-foreground">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section C: What To Do Next */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {t("results.whatToDoNext")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {harmReductionStepKeys.map((key, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Test Strip Result Logger */}
          <TestStripLogger reportId={report.id} className="mb-6" />

          {/* Official FDA Drug Information */}
          {matches.length > 0 && (
            <DrugInfoCard drugName={matches[0].drug_name} className="mb-6" />
          )}

          {/* Drug Interaction Checker */}
          {matches.length > 0 && (
            <InteractionChecker drugName={matches[0].drug_name} className="mb-6" />
          )}

          {/* Buddy Alert System */}
          <BuddyAlert
            reportId={report.id}
            drugName={matches.length > 0 ? matches[0].drug_name : undefined}
            riskLevel={riskLevel}
            className="mb-6"
          />

          {/* Report This Pill */}
          <ReportPill
            reportId={report.id}
            drugName={matches.length > 0 ? matches[0].drug_name : undefined}
            riskLevel={riskLevel}
            photoUrl={report.photo_url}
            className="mb-6"
          />

          {/* Harm Reduction Resources */}
          <HarmReductionResources className="mb-8" showFindHelp={riskLevel === "high"} />

          {/* Find Help Nearby — only for medium/high risk */}
          {(riskLevel === "medium" || riskLevel === "high") && (
            <>
              <NearbyHelp className="mb-4" />
              <Link to="/nearby-help" className="mb-8 block">
                <Button variant="outline" className="w-full gap-2 whitespace-normal h-auto py-3 text-center">
                  <MapPin className="h-4 w-4" />
                  {t("results.openFullMap")}
                </Button>
              </Link>
            </>
          )}

          {/* Match Feedback */}
          {matches.length > 0 && (
            <MatchFeedback
              reportId={report.id}
              matchId={matches[0].id}
              className="mb-6"
            />
          )}

          <Disclaimer className="mb-8" />

          {/* Share Toggle */}
          {user && data.report.user_id === user.id && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t("results.shareableLink")}</span>
                  </div>
                  <Button
                    variant={(data.report as any).shared ? "outline" : "default"}
                    size="sm"
                    disabled={sharing}
                    onClick={async () => {
                      setSharing(true);
                      try {
                        const newShared = !(data.report as any).shared;
                        await supabase
                          .from("reports")
                          .update({ shared: newShared } as any)
                          .eq("id", data.report.id);
                        setData({ ...data, report: { ...data.report, shared: newShared } as any });
                        if (newShared) {
                          await navigator.clipboard.writeText(window.location.href);
                          toast.success(t("results.shareCopied"));
                        } else {
                          toast.success(t("results.unshareMsg"));
                        }
                      } catch {
                        toast.error(t("results.shareError"));
                      } finally {
                        setSharing(false);
                      }
                    }}
                  >
                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                    {(data.report as any).shared ? t("results.unshare") : t("results.share")}
                  </Button>
                </div>
                {(data.report as any).shared && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("results.shareNote")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleSaveToHistory}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {user ? t("results.saveToAccount") : t("results.saveToHistory")}
            </Button>
            <Link to="/check" className="flex-1">
              <Button variant="default" className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("results.checkAnother")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
