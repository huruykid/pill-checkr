import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Info } from "lucide-react";

interface DrugScheduleBadgeProps {
  drugName: string;
  className?: string;
}

interface ScheduleData {
  schedule: string | null;
  rxcui: string | null;
  dea_schedule: string | null;
}

const scheduleLabels: Record<string, { label: string; color: string; risk: boolean }> = {
  "CII": { label: "Schedule II", color: "bg-destructive text-destructive-foreground", risk: true },
  "CIII": { label: "Schedule III", color: "bg-warning text-warning-foreground", risk: false },
  "CIV": { label: "Schedule IV", color: "bg-secondary text-secondary-foreground", risk: false },
  "CV": { label: "Schedule V", color: "bg-muted text-muted-foreground", risk: false },
};

export function DrugScheduleBadge({ drugName, className }: DrugScheduleBadgeProps) {
  const [schedule, setSchedule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!drugName) return;

    const fetchSchedule = async () => {
      try {
        // Use the enrich-drug-info edge function which already has DEA schedule data
        const { data, error } = await supabase.functions.invoke("enrich-drug-info", {
          body: { drug_name: drugName },
        });
        if (error) throw error;
        
        // Extract DEA schedule from label data
        const deaSchedule = data?.label?.dea_schedule || null;
        setSchedule(deaSchedule);
      } catch (e) {
        console.error("Error fetching schedule:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [drugName]);

  if (loading || !schedule) return null;

  const config = scheduleLabels[schedule] || { label: schedule, color: "bg-muted text-muted-foreground", risk: false };

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Badge className={`${config.color} gap-1`}>
        {config.risk ? <ShieldAlert className="h-3 w-3" /> : <Info className="h-3 w-3" />}
        {config.label}
      </Badge>
      {config.risk && (
        <span className="text-xs text-destructive font-medium">
          High counterfeit risk
        </span>
      )}
    </div>
  );
}
