import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { CounterfeitWarning } from "@/components/shared/CounterfeitWarning";
import { HarmReductionResources } from "@/components/shared/HarmReductionResources";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertTriangle,
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
  
  // Extract similarity score: "Visual similarity: 85%"
  const scoreMatch = matchReasons.match(/Visual similarity:\s*(\d+)%/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;
  
  // Extract flags: "Visual flags: rough edges, off-center imprint"
  const flagsMatch = matchReasons.match(/Visual flags?:\s*([^.]+)/i);
  const flags = flagsMatch 
    ? flagsMatch[1].split(',').map(f => f.trim()).filter(Boolean)
    : [];
  
  return {
    hasComparison: score !== null,
    score,
    flags,
  };
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

const harmReductionSteps = [
  "Never use alone - have someone with you who can call for help",
  "Start with a small test dose and wait to feel effects",
  "Have naloxone (Narcan) available and know how to use it",
  "Know the signs of overdose: slow breathing, blue lips, unresponsive",
  "If unable to confidently match, treat as higher risk",
  "Call 911 immediately if you suspect an overdose",
];

export default function Results() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check if any match has HIGH COUNTERFEIT RISK - must be before early returns
  const hasCounterfeitRisk = useMemo(() => {
    return data?.matches.some(
      (match) =>
        match.explanation?.toUpperCase().includes("HIGH COUNTERFEIT RISK")
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
        // Authenticated: update report with user_id
        await supabase
          .from("reports")
          .update({ user_id: user.id })
          .eq("id", data.report.id);
        toast.success("Saved to your account history");
      } else {
        // Anonymous: save to localStorage
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
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">No results found</p>
          <Link to="/check">
            <Button className="mt-4">Check Another Pill</Button>
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
    if (score >= 60) return { text: "High inconsistency", color: "text-danger" };
    if (score >= 30) return { text: "Moderate inconsistency", color: "text-warning" };
    return { text: "Low inconsistency", color: "text-success" };
  };

  const anomalyInfo = getAnomalyDescription(anomalyScore);

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <Link to="/check" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Check
          </Link>

          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">Analysis Results</h1>
            <RiskBadge level={riskLevel} size="lg" />
          </div>

          {/* Show pill photo if available */}
          {report.photo_url && (
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={report.photo_url}
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
                Possible Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="py-6 text-center">
                  <XCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">Unable to match to known references</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This pill could not be confidently matched to any entries in our reference database.
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
                                      <span className="text-xs">No reference image — visual comparison not available</span>
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

          {/* Counterfeit Warning - shown if any match has high counterfeit risk */}
          {hasCounterfeitRisk && <CounterfeitWarning className="mb-6" />}

          {/* Section B: Uncertainty & Consistency Check */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Uncertainty & Consistency Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground">Inconsistency Score</span>
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
                  <p className="text-sm font-medium text-muted-foreground">Consistency notes:</p>
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
                What To Do Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {harmReductionSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Harm Reduction Resources */}
          <HarmReductionResources className="mb-8" />

          <Disclaimer className="mb-8" />

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
