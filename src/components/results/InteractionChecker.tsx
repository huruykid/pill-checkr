import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, X, Loader2, ShieldAlert, Pill } from "lucide-react";

interface Interaction {
  drug1: string;
  drug2: string;
  severity: "minor" | "moderate" | "severe" | "unknown";
  severity_raw: string;
  description: string;
}

interface InteractionCheckerProps {
  drugName: string;
  className?: string;
}

const severityConfig = {
  severe: { color: "bg-destructive text-destructive-foreground", label: "Severe" },
  moderate: { color: "bg-warning text-warning-foreground", label: "Moderate" },
  minor: { color: "bg-muted text-muted-foreground", label: "Minor" },
  unknown: { color: "bg-secondary text-secondary-foreground", label: "Unknown" },
};

export function InteractionChecker({ drugName, className }: InteractionCheckerProps) {
  const [otherDrugs, setOtherDrugs] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [unresolvedDrugs, setUnresolvedDrugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [hasSevere, setHasSevere] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const addDrug = () => {
    const drug = inputValue.trim();
    if (drug && !otherDrugs.includes(drug) && otherDrugs.length < 10) {
      setOtherDrugs([...otherDrugs, drug]);
      setInputValue("");
      setChecked(false);
    }
  };

  const removeDrug = (index: number) => {
    setOtherDrugs(otherDrugs.filter((_, i) => i !== index));
    setChecked(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDrug();
    }
  };

  const checkInteractions = async () => {
    if (otherDrugs.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-interactions", {
        body: { drug_name: drugName, other_drugs: otherDrugs },
      });
      if (error) throw error;
      setInteractions(data.interactions || []);
      setUnresolvedDrugs(data.unresolved_drugs || []);
      setHasSevere(data.has_severe || false);
      setWarning(data.warning || null);
      setChecked(true);
    } catch (e) {
      console.error("Error checking interactions:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Drug Interaction Checker
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Check if <strong>{drugName}</strong> may interact with other medications you take
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drug input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a medication name..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addDrug}
              disabled={!inputValue.trim() || loading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Drug tags */}
          {otherDrugs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {otherDrugs.map((drug, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {drug}
                  <button
                    onClick={() => removeDrug(i)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Check button */}
        <Button
          onClick={checkInteractions}
          disabled={otherDrugs.length === 0 || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Check Interactions"
          )}
        </Button>

        {/* Results */}
        {checked && !loading && (
          <div className="space-y-3">
            {/* Severe warning banner */}
            {hasSevere && warning && (
              <div className="flex items-start gap-3 rounded-lg border-2 border-destructive/30 bg-destructive/10 p-4">
                <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-destructive">{warning}</p>
              </div>
            )}

            {/* Unresolved drugs */}
            {unresolvedDrugs.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Could not find: {unresolvedDrugs.join(", ")}. Try a different spelling or generic name.
              </p>
            )}

            {/* Interaction list */}
            {interactions.length > 0 ? (
              <div className="space-y-2">
                {interactions.map((interaction, i) => {
                  const config = severityConfig[interaction.severity];
                  return (
                    <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {interaction.drug1} + {interaction.drug2}
                        </span>
                        <Badge className={config.color}>
                          {interaction.severity === "severe" && (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {interaction.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No known interactions found between these medications.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
