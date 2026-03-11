import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flag, Loader2, CheckCircle, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

interface ReportPillProps {
  reportId: string;
  drugName?: string;
  riskLevel?: string;
  photoUrl?: string | null;
  className?: string;
}

export function ReportPill({ reportId, drugName, riskLevel, photoUrl, className }: ReportPillProps) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const useApproximateLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=10`,
            { headers: { "User-Agent": "FentFinder-HarmReduction/1.0" } }
          );
          if (resp.ok) {
            const data = await resp.json();
            const addr = data.address || {};
            setCity(addr.city || addr.town || addr.village || addr.county || "");
            setState(addr.state || "");
            toast.success("Approximate location detected (city-level only)");
          }
        } catch {
          toast.error("Could not determine location");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        toast.error("Location access denied");
      },
      { timeout: 10000 }
    );
  };

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
        location_lat: lat,
        location_lng: lng,
        is_anonymous: true,
      });
      if (error) throw error;
      setSubmitted(true);
      setOpen(false);
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
    <>
      <Button
        variant="warning"
        size="lg"
        className={`w-full gap-2 font-semibold ${className || ""}`}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-5 w-5" />
        ⚠️ Report This Pill
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-warning" />
              Report This Pill
            </DialogTitle>
            <DialogDescription>
              Help warn others anonymously. Location is optional and city-level only — we never store exact coordinates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Risk level auto-filled */}
            {riskLevel && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Risk Level</Label>
                <div className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium capitalize",
                  riskLevel === "high" && "bg-destructive/10 text-destructive",
                  riskLevel === "medium" && "bg-warning/10 text-warning",
                  riskLevel === "low" && "bg-success/10 text-success",
                )}>
                  {riskLevel} risk (auto-filled from analysis)
                </div>
              </div>
            )}

            {/* Location section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Location (optional)</Label>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={useApproximateLocation}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                {geoLoading ? "Detecting..." : "Use my approximate location"}
              </Button>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or enter manually</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>

              {city && state && (
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {city}, {state}
                  </span>
                </div>
              )}
            </div>

            {/* Suspicious details */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">What seemed suspicious? (optional)</Label>
              <Textarea
                placeholder="e.g. Unusual taste, wrong color, unexpected effects, crumbled easily..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              This report is completely anonymous. No account information is attached.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              variant="warning"
              className="w-full gap-2 font-semibold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flag className="h-4 w-4" />
              )}
              Submit Anonymous Report
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
