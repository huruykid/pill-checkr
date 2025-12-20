import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  Skull,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Report = Database["public"]["Tables"]["reports"]["Row"];
type Match = Database["public"]["Tables"]["matches"]["Row"];

interface ResultsData {
  report: Report;
  matches: Match[];
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
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchResults();
    }
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
      toast.success("Saved to history");
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
            <p className="text-muted-foreground font-sans">Loading results...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground font-sans">No results found</p>
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

  const getRiskHeaderBg = () => {
    if (riskLevel === "high") return "bg-primary";
    if (riskLevel === "medium") return "bg-secondary";
    return "bg-success";
  };

  return (
    <Layout>
      {/* Risk Header */}
      <section className={`relative py-10 md:py-14 texture-skulls overflow-hidden ${getRiskHeaderBg()} ${riskLevel === "high" ? "text-primary-foreground" : riskLevel === "medium" ? "text-secondary-foreground" : "text-success-foreground"}`}>
        {/* Decorative skulls for high risk */}
        {riskLevel === "high" && (
          <>
            <div className="absolute top-6 left-[10%] opacity-20">
              <Skull className="h-12 w-12" />
            </div>
            <div className="absolute bottom-8 right-[15%] opacity-20">
              <Skull className="h-10 w-10" />
            </div>
            <div className="absolute top-1/2 left-[5%] opacity-15">
              <Skull className="h-8 w-8" />
            </div>
          </>
        )}
        
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Link to="/check" className="mb-4 inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
              <ArrowLeft className="h-4 w-4" />
              Back to Check
            </Link>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              ANALYSIS RESULTS
            </h1>
            <RiskBadge level={riskLevel} size="lg" />
          </div>
        </div>
      </section>

      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          {/* Emergency Banner for High Risk */}
          {riskLevel === "high" && (
            <Disclaimer variant="emergency" className="mb-8" />
          )}

          {/* Section A: Possible Matches */}
          <Card className="mb-6 border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
                <Pill className="h-5 w-5 text-primary" />
                Possible Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {matches.length === 0 ? (
                <div className="py-6 text-center">
                  <XCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground font-semibold">Unable to match to known references</p>
                  <p className="text-sm text-muted-foreground mt-1 font-sans">
                    This pill could not be confidently matched to any entries in our reference database.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <div key={match.id} className="rounded-sm border-2 border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted shrink-0">
                            <Pill className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-display text-lg uppercase text-foreground">{match.drug_name}</h3>
                            <p className="text-sm text-muted-foreground font-sans">
                              Imprint: {match.matched_imprint || "Unknown"} • 
                              {match.matched_shape && ` ${match.matched_shape}`}
                              {match.matched_color && ` • ${match.matched_color}`}
                            </p>
                            {match.match_reasons && (
                              <p className="mt-1 text-sm text-primary/80 font-sans">{match.match_reasons}</p>
                            )}
                            {match.explanation && (
                              <p className="mt-2 text-sm text-muted-foreground font-sans">{match.explanation}</p>
                            )}
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

          {/* Section B: Uncertainty & Consistency Check */}
          <Card className="mb-6 border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
                <Gauge className="h-5 w-5 text-primary" />
                Uncertainty & Consistency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Anomaly Score Display */}
              <div className="rounded-sm bg-muted/50 p-4 border-2 border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display uppercase text-foreground">Inconsistency Score</span>
                  <span className={`font-display text-2xl ${anomalyInfo.color}`}>
                    {anomalyScore}/100
                  </span>
                </div>
                <div className="w-full bg-muted rounded-sm h-4 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      anomalyScore >= 60 ? "bg-danger" : 
                      anomalyScore >= 30 ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${anomalyScore}%` }}
                  />
                </div>
                <p className={`text-sm mt-2 font-semibold uppercase ${anomalyInfo.color}`}>
                  {anomalyInfo.text}
                </p>
              </div>

              {/* Match Confidence */}
              {matchConfidence && (
                <div className="flex items-center gap-3 rounded-sm bg-muted/50 px-4 py-3 border-2 border-border">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground font-sans">Match Confidence: </span>
                    <span className={`font-semibold uppercase ${
                      matchConfidence === "high" ? "text-success" :
                      matchConfidence === "medium" ? "text-warning" : "text-danger"
                    }`}>
                      {matchConfidence}
                    </span>
                  </div>
                </div>
              )}

              {/* Anomaly Reasons */}
              {anomalyReasons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-display uppercase text-muted-foreground">Consistency Notes:</p>
                  <ul className="space-y-2">
                    {anomalyReasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-warning shrink-0" />
                        <span className="text-muted-foreground font-sans">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Reasons */}
              {riskReasons.length > 0 && (
                <div className="space-y-2 border-t-2 border-border pt-4">
                  <p className="text-sm font-display uppercase text-muted-foreground">Risk Assessment:</p>
                  <ul className="space-y-2">
                    {riskReasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                          riskLevel === "high" ? "bg-danger" : 
                          riskLevel === "medium" ? "bg-warning" : "bg-success"
                        }`} />
                        <span className="text-muted-foreground font-sans">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.image_quality === "poor" && (
                <div className="flex items-center gap-2 rounded-sm bg-warning-light px-3 py-2 text-sm text-warning border-2 border-warning/30">
                  <ImageOff className="h-4 w-4" />
                  <span className="font-sans">Image quality is poor - results may be less accurate</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section C: What To Do Next */}
          <Card className="mb-8 border-2 border-secondary">
            <CardHeader className="bg-secondary/10">
              <CardTitle className="flex items-center gap-2 font-display uppercase tracking-wide">
                <Info className="h-5 w-5 text-secondary-foreground" />
                What To Do Next
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {harmReductionSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground font-sans">{step}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Disclaimer */}
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
              Save to History
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