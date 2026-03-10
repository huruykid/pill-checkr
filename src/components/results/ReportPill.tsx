import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ReportPillProps {
  reportId: string;
  drugName?: string;
  riskLevel?: string;
  photoUrl?: string | null;
  className?: string;
}

export function ReportPill({ reportId, drugName, riskLevel, photoUrl, className }: ReportPillProps) {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("counterfeit_reports").insert({
        report_id: reportId,
        drug_name: drugName || null,
        risk_level: riskLevel || null,
        city: city.trim() || null,
        state: state.trim() || null,
        notes: notes.trim() || null,
        photo_url: photoUrl || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Report submitted anonymously. Thank you for helping keep others safe.");
    } catch (e) {
      console.error("Error submitting report:", e);
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-3 py-6">
          <CheckCircle className="h-5 w-5 text-success" />
          <p className="text-sm text-muted-foreground">
            Report submitted anonymously. This helps warn others in your area.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="h-5 w-5 text-warning" />
          Report This Pill
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help warn others anonymously. Your location data is optional and city-level only.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="City (optional)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
          />
          <Input
            placeholder="State (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            maxLength={50}
          />
        </div>
        <Textarea
          placeholder="Any additional notes... (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          variant="warning"
          className="w-full gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Flag className="h-4 w-4" />
          )}
          Submit Anonymous Report
        </Button>
      </CardContent>
    </Card>
  );
}
