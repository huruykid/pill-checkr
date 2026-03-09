import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle, FileText, ExternalLink, Loader2, ShieldAlert } from "lucide-react";

interface DrugInfoCardProps {
  drugName: string;
  className?: string;
}

interface LabelData {
  warnings: string | null;
  overdosage: string | null;
  contraindications: string | null;
  adverse_reactions: string | null;
  drug_interactions: string | null;
  brand_name: string;
  generic_name: string | null;
  manufacturer: string | null;
  set_id: string | null;
}

interface AdverseData {
  total_reports: number;
  serious_reports: number;
  non_serious_reports: number;
}

interface DrugInfoResponse {
  drug_name: string;
  label: LabelData | null;
  adverse_events: AdverseData | null;
}

export function DrugInfoCard({ drugName, className }: DrugInfoCardProps) {
  const [data, setData] = useState<DrugInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!drugName) return;

    const fetchInfo = async () => {
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "enrich-drug-info",
          { body: { drug_name: drugName } }
        );
        if (fnError) throw fnError;
        setData(result);
      } catch (e) {
        console.error("Error fetching drug info:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [drugName]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading FDA drug information...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || (!data.label && !data.adverse_events)) {
    return null; // Silently hide if no data available
  }

  const { label, adverse_events } = data;

  const truncateText = (text: string | null, maxLen = 500) => {
    if (!text) return null;
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "…";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Official FDA Drug Information
        </CardTitle>
        {label && (
          <p className="text-sm text-muted-foreground">
            {label.brand_name}
            {label.generic_name && ` (${label.generic_name})`}
            {label.manufacturer && ` — ${label.manufacturer}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adverse Events Badge */}
        {adverse_events && adverse_events.total_reports > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
            <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-foreground">FDA Adverse Event Reports</span>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {adverse_events.total_reports.toLocaleString()} total reports
                </Badge>
                {adverse_events.serious_reports > 0 && (
                  <Badge variant="destructive">
                    {adverse_events.serious_reports.toLocaleString()} serious
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible sections */}
        {label && (
          <Accordion type="multiple" className="w-full">
            {label.warnings && (
              <AccordionItem value="warnings">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Warnings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {truncateText(label.warnings, 800)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {label.overdosage && (
              <AccordionItem value="overdosage">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-danger" />
                    Overdose Symptoms & Emergency Guidance
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {truncateText(label.overdosage, 800)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {label.contraindications && (
              <AccordionItem value="contraindications">
                <AccordionTrigger className="text-sm font-medium">
                  Contraindications
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {truncateText(label.contraindications, 800)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {label.adverse_reactions && (
              <AccordionItem value="adverse_reactions">
                <AccordionTrigger className="text-sm font-medium">
                  Known Adverse Reactions
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {truncateText(label.adverse_reactions, 800)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}

        {/* Link to full FDA label */}
        {label?.set_id && (
          <a
            href={`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${label.set_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View Full FDA Label
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
