import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Loader2 } from "lucide-react";

interface HotspotData {
  state: string;
  count: number;
  cities: string[];
  latest_drug: string | null;
  latest_risk: string | null;
}

interface CounterfeitHotspotsProps {
  className?: string;
}

export function CounterfeitHotspots({ className }: CounterfeitHotspotsProps) {
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalReports, setTotalReports] = useState(0);

  useEffect(() => {
    fetchHotspots();
  }, []);

  const fetchHotspots = async () => {
    try {
      const { data, error } = await supabase
        .from("counterfeit_reports")
        .select("city, state, drug_name, risk_level, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      setTotalReports(data?.length || 0);

      // Aggregate by state
      const grouped: Record<string, { count: number; cities: Set<string>; latest_drug: string | null; latest_risk: string | null }> = {};
      for (const r of data || []) {
        if (!r.state) continue;
        const key = r.state;
        if (!grouped[key]) {
          grouped[key] = { count: 0, cities: new Set(), latest_drug: r.drug_name, latest_risk: r.risk_level };
        }
        grouped[key].count++;
        if (r.city) grouped[key].cities.add(r.city);
      }

      const sorted = Object.entries(grouped)
        .map(([state, val]) => ({
          state,
          count: val.count,
          cities: Array.from(val.cities).slice(0, 3),
          latest_drug: val.latest_drug,
          latest_risk: val.latest_risk,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setHotspots(sorted);
    } catch (e) {
      console.error("Error fetching hotspots:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading report data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-warning" />
          Counterfeit Report Hotspots
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalReports} anonymous reports submitted by users to help warn others.
        </p>
      </CardHeader>
      <CardContent>
        {hotspots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reports yet. Be the first to help warn others by reporting a suspicious pill.
          </p>
        ) : (
          <div className="space-y-2">
            {hotspots.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${
                    h.count >= 5 ? "text-destructive" : h.count >= 2 ? "text-warning" : "text-muted-foreground"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {h.state}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {h.cities.length > 0 ? h.cities.join(", ") : "Location not specified"}
                      {h.latest_drug && ` · Latest: ${h.latest_drug}`}
                    </p>
                  </div>
                </div>
                <Badge variant={h.count >= 5 ? "destructive" : "secondary"} className="shrink-0">
                  {h.count} {h.count === 1 ? "report" : "reports"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
