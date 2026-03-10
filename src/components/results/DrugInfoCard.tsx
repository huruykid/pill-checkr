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
import { AlertTriangle, FileText, ExternalLink, Loader2, ShieldAlert, Skull, Building2, Siren, Info } from "lucide-react";

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
  dosage_and_administration: string | null;
  brand_name: string;
  generic_name: string | null;
  manufacturer: string | null;
  set_id: string | null;
  dea_schedule: string | null;
  substance_name: string | null;
  product_type: string | null;
  route: string | null;
}

interface AdverseData {
  total_reports: number;
  serious_reports: number;
  non_serious_reports: number;
  deaths: number;
  hospitalizations: number;
  er_visits: number;
}

interface DrugInfoResponse {
  drug_name: string;
  label: LabelData | null;
  adverse_events: AdverseData | null;
}

const scheduleLabels: Record<string, { label: string; variant: "destructive" | "secondary" }> = {
  CII: { label: "Schedule II — High Abuse Potential", variant: "destructive" },
  CIII: { label: "Schedule III", variant: "secondary" },
  CIV: { label: "Schedule IV", variant: "secondary" },
  CV: { label: "Schedule V", variant: "secondary" },
};

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
    return null;
  }

  const { label, adverse_events } = data;

  const truncateText = (text: string | null, maxLen = 500) => {
    if (!text) return null;
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "…";
  };

  const scheduleInfo = label?.dea_schedule ? scheduleLabels[label.dea_schedule] : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Official FDA Drug Information
        </CardTitle>
        {label && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {label.brand_name}
              {label.generic_name && ` (${label.generic_name})`}
              {label.manufacturer && ` — ${label.manufacturer}`}
            </p>
            {label.route && (
              <p className="text-xs text-muted-foreground">Route: {label.route}</p>
            )}
          </div>
        )}
        {/* DEA Schedule Badge */}
        {scheduleInfo && (
          <Badge variant={scheduleInfo.variant} className="gap-1 w-fit mt-1">
            <ShieldAlert className="h-3 w-3" />
            {scheduleInfo.label}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adverse Events Summary with Outcome Breakdown */}
        {adverse_events && adverse_events.total_reports > 0 && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
              <span className="text-sm font-medium text-foreground">FDA Adverse Event Reports</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {adverse_events.total_reports.toLocaleString()} total
              </Badge>
              {adverse_events.serious_reports > 0 && (
                <Badge variant="destructive">
                  {adverse_events.serious_reports.toLocaleString()} serious
                </Badge>
              )}
            </div>
            {/* Outcome breakdown */}
            {(adverse_events.deaths > 0 || adverse_events.hospitalizations > 0 || adverse_events.er_visits > 0) && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                {adverse_events.deaths > 0 && (
                  <div className="flex flex-col items-center rounded-lg bg-destructive/10 p-2">
                    <Skull className="h-4 w-4 text-destructive mb-1" />
                    <span className="text-lg font-bold text-destructive">
                      {adverse_events.deaths.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Deaths</span>
                  </div>
                )}
                {adverse_events.hospitalizations > 0 && (
                  <div className="flex flex-col items-center rounded-lg bg-warning/10 p-2">
                    <Building2 className="h-4 w-4 text-warning mb-1" />
                    <span className="text-lg font-bold text-warning">
                      {adverse_events.hospitalizations.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Hospitalizations</span>
                  </div>
                )}
                {adverse_events.er_visits > 0 && (
                  <div className="flex flex-col items-center rounded-lg bg-secondary/20 p-2">
                    <Siren className="h-4 w-4 text-secondary-foreground mb-1" />
                    <span className="text-lg font-bold text-secondary-foreground">
                      {adverse_events.er_visits.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Other Serious</span>
                  </div>
                )}
              </div>
            )}
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
                    <AlertTriangle className="h-4 w-4 text-destructive" />
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

            {label.drug_interactions && (
              <AccordionItem value="drug_interactions">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Drug Interactions
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {truncateText(label.drug_interactions, 800)}
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

            {label.dosage_and_administration && (
              <AccordionItem value="dosage">
                <AccordionTrigger className="text-sm font-medium">
                  Dosage & Administration
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {truncateText(label.dosage_and_administration, 800)}
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
