import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { detectWithToast, type CityState } from "@/lib/location";
import { hapticSuccess } from "@/lib/platform";
import { captureLocation, type Precision } from "@/lib/geo";
import { PrecisionChoice } from "./PrecisionChoice";
import { toast } from "sonner";
import { Loader2, LocateFixed, Send } from "lucide-react";

type Strip = "positive" | "negative" | "not_tested";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultLocation?: CityState | null;
  onSubmitted?: () => void;
  /** Prefill from a pill check result so the user only confirms and posts. */
  prefill?: { imprint?: string | null; drug?: string | null; strip?: Strip | null; reportId?: string | null };
}

const STRIP_OPTIONS: { value: Strip; label: string; hint: string; cls: string }[] = [
  { value: "positive", label: "Positive", hint: "Fentanyl detected", cls: "data-[on=true]:bg-danger data-[on=true]:text-danger-foreground data-[on=true]:border-danger" },
  { value: "negative", label: "Negative", hint: "No fentanyl on strip", cls: "data-[on=true]:bg-foreground data-[on=true]:text-background data-[on=true]:border-foreground" },
  { value: "not_tested", label: "Not tested", hint: "Reporting by sight", cls: "data-[on=true]:bg-warning data-[on=true]:text-foreground data-[on=true]:border-warning" },
];

/** "Report what you found" — works without an account. City-level only; no GPS stored. */
export function ReportFoundSheet({ open, onOpenChange, defaultLocation, onSubmitted, prefill }: Props) {
  const { user } = useAuth();
  const [imprint, setImprint] = useState(prefill?.imprint || "");
  const [drug, setDrug] = useState(prefill?.drug || "");
  const [strip, setStrip] = useState<Strip | null>(prefill?.strip ?? null);
  const [city, setCity] = useState(defaultLocation?.city || "");
  const [state, setState] = useState(defaultLocation?.state || "");
  const [notes, setNotes] = useState("");
  const [geo, setGeo] = useState(false);
  const [precision, setPrecision] = useState<Precision>("city");
  const [captured, setCaptured] = useState<{ hexCell: string; point?: { lat: number; lng: number }; placeType: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.imprint) setImprint(prefill.imprint);
    if (prefill.drug) setDrug(prefill.drug);
    if (prefill.strip) setStrip(prefill.strip);
  }, [open, prefill]);

  const locate = async () => {
    setGeo(true);
    try {
      const c = await captureLocation(precision);
      setCity(c.city);
      setState(c.state);
      setCaptured({ hexCell: c.hexCell, point: c.point, placeType: c.placeType });
      toast.success(precision === "precise" ? "Exact spot captured" : `Near ${c.city || c.state}`);
    } catch {
      // Fall back to the city-only path if precise capture fails.
      const loc = await detectWithToast();
      if (loc) { setCity(loc.city); setState(loc.state); }
    } finally {
      setGeo(false);
    }
  };

  const canSubmit = strip !== null && (imprint.trim() || drug.trim());

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { data: inserted, error } = await supabase.from("counterfeit_reports").insert({
        imprint: imprint.trim().toUpperCase() || null,
        drug_name: drug.trim() || null,
        strip_result: strip!,
        risk_level: strip === "positive" ? "high" : strip === "not_tested" ? "medium" : "low",
        city: city.trim() || null,
        state: state.trim() || null,
        notes: notes.trim() || null,
        is_anonymous: !user,
        source: prefill?.reportId ? "results" : "alerts",
        report_id: prefill?.reportId || null,
        report_type: "pill",
        evidence_tier: strip === "not_tested" ? "visual" : "strip",
        hex_cell: captured?.hexCell || null,
      }).select("id").single();
      if (error) throw error;

      // Precise point goes to the restricted table — never to the public view.
      if (captured?.point && inserted?.id) {
        const { error: locError } = await supabase.from("report_locations").insert({
          report_id: inserted.id,
          latitude: captured.point.lat,
          longitude: captured.point.lng,
          precision: "precise",
          place_type: captured.placeType,
        });
        if (locError) console.error("precise location not stored:", locError);
      }
      hapticSuccess();
      toast.success("Reported. Thank you — this helps people near you.");
      setImprint(""); setDrug(""); setStrip(null); setNotes(""); setCaptured(null); setPrecision("city");
      onOpenChange(false);
      onSubmitted?.();
    } catch (e) {
      console.error(e);
      toast.error("Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">Report what you found</SheetTitle>
          <SheetDescription>
            Anonymous. City-level only — we never store your exact location or identity.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <Label>Test strip result</Label>
            <div className="grid grid-cols-3 gap-2">
              {STRIP_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  data-on={strip === o.value}
                  onClick={() => setStrip(o.value)}
                  className={cn(
                    "min-h-[56px] rounded-lg border-2 border-border bg-card px-2 py-2 text-left transition-colors",
                    o.cls,
                  )}
                >
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-[11px] opacity-80">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rf-imprint">Imprint</Label>
              <Input id="rf-imprint" placeholder="M 30" value={imprint} maxLength={40}
                onChange={(e) => setImprint(e.target.value)} className="text-base font-mono uppercase" autoCapitalize="characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rf-drug">Sold as</Label>
              <Input id="rf-drug" placeholder="Oxycodone" value={drug} maxLength={80}
                onChange={(e) => setDrug(e.target.value)} className="text-base" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Where (optional)</Label>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={locate} disabled={geo}>
                {geo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                Use my city
              </Button>
            </div>
            <PrecisionChoice value={precision} onChange={(p) => { setPrecision(p); setCaptured(null); }} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} className="text-base" />
              <Input placeholder="State" value={state} maxLength={40} onChange={(e) => setState(e.target.value)} className="text-base" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rf-notes">Notes (optional, admin-only)</Label>
            <Textarea id="rf-notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Color, shape, anything else that would help someone recognize it" className="text-base" />
          </div>

          <Button size="lg" className="w-full gap-2" disabled={!canSubmit || busy} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post alert
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
