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
  Phone,
  AlertCircle,
  Info,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Report = Database["public"]["Tables"]["reports"]["Row"];
type Match = Database["public"]["Tables"]["matches"]["Row"];

interface ResultsData {
  report: Report;
  matches: Match[];
}

const riskReasons: Record<string, string[]> = {
  high: [
    "No confident match found in reference database",
    "Pill characteristics inconsistent with known pharmaceuticals",
    "Image quality may affect analysis accuracy",
    "This type of pill is commonly counterfeited",
  ],
  medium: [
    "Match confidence is not definitive",
    "Some features do not match reference exactly",
    "Consider additional verification methods",
  ],
  low: [
    "Pill matches known reference database entry",
    "Visual characteristics are consistent",
    "Still recommended to verify through other means",
  ],
};

const harmReductionSteps = [
  "Never use alone - have someone with you who can call for help",
  "Start with a small test dose and wait to feel effects",
  "Have naloxone (Narcan) available and know how to use it",
  "Know the signs of overdose: slow breathing, blue lips, unresponsive",
  "If in doubt, don't use - seek drug checking services if available",
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
      // Fetch report
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

      // Fetch matches
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
      // For anonymous users, save to localStorage
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

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          {/* Back Button */}
          <Link to="/check" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Check
          </Link>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">Analysis Results</h1>
            <RiskBadge level={riskLevel} size="lg" />
          </div>

          {/* Emergency Banner for High Risk */}
          {riskLevel === "high" && (
            <Disclaimer variant="emergency" className="mb-8" />
          )}

          {/* Risk Signal Panel */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {riskLevel === "high" && <AlertTriangle className="h-5 w-5 text-danger" />}
                {riskLevel === "medium" && <AlertCircle className="h-5 w-5 text-warning" />}
                {riskLevel === "low" && <CheckCircle className="h-5 w-5 text-success" />}
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {riskReasons[riskLevel].map((reason, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      riskLevel === "high" ? "bg-danger" : 
                      riskLevel === "medium" ? "bg-warning" : "bg-success"
                    }`} />
                    <span className="text-muted-foreground">{reason}</span>
                  </li>
                ))}
              </ul>
              
              {report.image_quality === "poor" && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-warning-light px-3 py-2 text-sm text-warning">
                  <ImageOff className="h-4 w-4" />
                  Image quality is poor - results may be less accurate
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Matches */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Top Matches</h2>
            {matches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <XCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No matches found in reference database</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card key={match.id} className="overflow-hidden">
                    <CardContent className="p-4">
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
                            {match.explanation && (
                              <p className="mt-2 text-sm text-muted-foreground">{match.explanation}</p>
                            )}
                          </div>
                        </div>
                        <ConfidenceBadge level={(match.confidence || "low") as "low" | "medium" | "high"} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* What To Do Next */}
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
