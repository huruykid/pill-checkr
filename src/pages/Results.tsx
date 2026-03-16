import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { CounterfeitWarning } from "@/components/shared/CounterfeitWarning";
import { HarmReductionResources } from "@/components/shared/HarmReductionResources";
import { DrugInfoCard } from "@/components/results/DrugInfoCard";
import { InteractionChecker } from "@/components/results/InteractionChecker";
import { EmergencyBar } from "@/components/results/EmergencyBar";
import { BuddyAlert } from "@/components/results/BuddyAlert";
import { ReportPill } from "@/components/results/ReportPill";
import { RegionalCounterfeitAlert } from "@/components/results/RegionalCounterfeitAlert";
import { NearbyHelp } from "@/components/shared/NearbyHelp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
  HelpCircle,
  Gauge,
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

      // Fetch regional counterfeit alerts for matched drug names
      if (matches && matches.length > 0) {
        const drugNames = [...new Set(matches.map(m => m.drug_name))];
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const { data: cfReports } = await supabase
          .from("counterfeit_reports")
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
          anomalyScore: data.report.anomaly_score,
          matchConfidence: data.report.match_confidence,
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
  const anomalyScore = report.anomaly_score ?? 0;
  const anomalyReasons = report.anomaly_reasons ?? [];
  const riskReasons = report.risk_reasons ?? [];
  const matchConfidence = report.match_confidence as "low" | "medium" | "high" | null;

  const getAnomalyDescription = (score: number) => {
    if (score >= 60) return { text: t("results.highInconsistency"), color: "text-danger" };
    if (score >= 30) return { text: t("results.moderateInconsistency"), color: "text-warning" };
    return { text: t("results.lowInconsistency"), color: "text-success" };
  };

  const anomalyInfo = getAnomalyDescription(anomalyScore);

  return (
    <Layout urgentEmergency={riskLevel === "high"}>
      <SEOHead
        title="Pill Analysis Results | Fent Finder"
        description="View your pill analysis results including visual matching, consistency scoring, and harm reduction guidance."
        path={`/results/${reportId}`}
        jsonLd={makeWebPage("Pill Analysis Results", `/results/${reportId}`, "Pill analysis results with visual matching and safety guidance.")}
      />
      <div className="container py-8 md:py-12">
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
            const isLow = riskLevel === "low" && matchConfidence !== "low" && matches.length > 0;
            const isHigh = riskLevel === "high" || matches.length === 0;

            const config = isLow
              ? {
                  icon: <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />,
                  border: "border-l-success",
                  bg: "bg-success-light",
                  message: t("results.summary.lowRisk").replace("{drug}", topDrug || ""),
                }
              : isHigh
                ? {
                    icon: <AlertTriangle className="h-6 w-6 text-danger shrink-0 mt-0.5" />,
                    border: "border-l-danger",
                    bg: "bg-danger-light",
                    message: topDrug
                      ? t("results.summary.highRiskDrug").replace("{drug}", topDrug)
                      : t("results.summary.highRiskNone"),
                  }
                : {
                    icon: <AlertCircle className="h-6 w-6 text-warning shrink-0 mt-0.5" />,
                    border: "border-l-warning",
                    bg: "bg-warning-light",
                    message: t("results.summary.medRisk").replace("{drug}", topDrug || t("results.noMatch")),
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
                        <ConfidenceBadge level={(match.confidence || "low") as "low" | "medium" | "high"} />
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

          {/* Section B: Uncertainty & Consistency Check */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                {t("results.uncertaintyTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Individual Match Confidence Bars */}
              {matches.length > 0 && (() => {
                const topMatch = matches[0];
                const imprintMatch = (report.imprint_text && topMatch.matched_imprint)
                  ? (report.imprint_text.toLowerCase().trim() === topMatch.matched_imprint.toLowerCase().trim() ? 100
                    : report.imprint_text.toLowerCase().includes(topMatch.matched_imprint.toLowerCase()) || topMatch.matched_imprint.toLowerCase().includes(report.imprint_text.toLowerCase()) ? 65
                    : 20)
                  : 0;
                const colorMatch = (report.color && topMatch.matched_color)
                  ? (report.color === topMatch.matched_color ? 100 : 30)
                  : 0;
                const shapeMatch = (report.shape && topMatch.matched_shape)
                  ? (report.shape === topMatch.matched_shape ? 100 : 25)
                  : 0;

                // Scoring match: parse from match_reasons
                const scoringMatchText = topMatch.match_reasons?.includes("Scoring pattern matches");
                const scoringValue = scoringMatchText ? 100 : (topMatch.match_reasons?.includes("scoring") ? 30 : 0);

                // Size match: parse from match_reasons
                const sizeExactMatch = topMatch.match_reasons?.match(/Size matches \(±([\d.]+)mm\)/);
                const sizeCloseMatch = topMatch.match_reasons?.match(/Size close \(±([\d.]+)mm\)/);
                const sizeValue = sizeExactMatch ? 100 : sizeCloseMatch ? 60 : 0;

                // Size deviation: derive from anomaly score inversely
                const sizeDeviation = Math.max(0, Math.min(100, 100 - anomalyScore * 1.2));

                const bars = [
                  { label: "Imprint Match", value: imprintMatch, icon: "🔤" },
                  { label: "Color Similarity", value: colorMatch, icon: "🎨" },
                  { label: "Shape Match", value: shapeMatch, icon: "🔷" },
                  { label: "Scoring Pattern", value: scoringValue || sizeDeviation, icon: "➗", hide: !scoringMatchText && !topMatch.match_reasons?.includes("scoring") },
                  { label: "Size Match", value: sizeValue || sizeDeviation, icon: "📏", hide: !sizeExactMatch && !sizeCloseMatch },
                  { label: "Size Consistency", value: sizeDeviation, icon: "📏", hide: !!sizeExactMatch || !!sizeCloseMatch },
                  { label: "Logo Match", value: topMatch.match_reasons?.includes("Logo matches") ? 100 : 0, icon: "🏷️", hide: !topMatch.match_reasons?.includes("Logo matches") },
                ].filter(b => !b.hide);

                const getBarColor = (v: number) =>
                  v >= 70 ? "bg-success" : v >= 40 ? "bg-warning" : "bg-danger";
                const getTextColor = (v: number) =>
                  v >= 70 ? "text-success" : v >= 40 ? "text-warning" : "text-danger";

                return (
                  <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground mb-1">{t("results.matchBreakdown")}</p>
                    {bars.map((bar) => (
                      <div key={bar.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{bar.icon}</span> {bar.label}
                          </span>
                          <span className={`text-xs font-semibold ${getTextColor(bar.value)}`}>
                            {bar.value}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getBarColor(bar.value)}`}
                            style={{ width: `${bar.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">{t("results.inconsistencyScore")}</span>
                  <span className={`font-bold text-lg ${anomalyInfo.color}`}>
                    {anomalyScore}/100
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      anomalyScore >= 60 ? "bg-danger" : 
                      anomalyScore >= 30 ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${anomalyScore}%` }}
                  />
                </div>
                <p className={`text-sm mt-2 ${anomalyInfo.color}`}>
                  {anomalyInfo.text}
                </p>
              </div>

              {matchConfidence && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Match Confidence: </span>
                    <span className={`font-medium ${
                      matchConfidence === "high" ? "text-success" :
                      matchConfidence === "medium" ? "text-warning" : "text-danger"
                    }`}>
                      {matchConfidence.charAt(0).toUpperCase() + matchConfidence.slice(1)}
                    </span>
                  </div>
                </div>
              )}

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

              {riskReasons.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Risk assessment notes:</p>
                  <ul className="space-y-2">
                    {riskReasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                          riskLevel === "high" ? "bg-danger" : 
                          riskLevel === "medium" ? "bg-warning" : "bg-success"
                        }`} />
                        <span className="text-muted-foreground">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.image_quality === "poor" && (
                <div className="flex items-center gap-2 rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">
                  <ImageOff className="h-4 w-4" />
                  Image quality is poor - results may be less accurate
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
                <Button variant="outline" className="w-full gap-2">
                  <MapPin className="h-4 w-4" />
                  Open Full Map — Find Treatment Centers & Naloxone Near You
                </Button>
              </Link>
            </>
          )}

          <Disclaimer className="mb-8" />

          {/* Share Toggle */}
          {user && data.report.user_id === user.id && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Shareable Link</span>
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
                          toast.success("Link copied! Anyone with this link can view the results.");
                        } else {
                          toast.success("Link unshared — only you can view this report now.");
                        }
                      } catch {
                        toast.error("Failed to update sharing");
                      } finally {
                        setSharing(false);
                      }
                    }}
                  >
                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                    {(data.report as any).shared ? "Unshare" : "Share"}
                  </Button>
                </div>
                {(data.report as any).shared && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Anyone with the link can view this report. No personal info is shared.
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
              {user ? "Save to Account" : "Save to History"}
            </Button>
            <Link to="/check" className="flex-1">
              <Button variant="default" className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Check Another Pill
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
