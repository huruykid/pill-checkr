import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotspotData {
  state: string;
  count: number;
  cities: string[];
  highRiskCount: number;
  latest_drug: string | null;
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
        .from("counterfeit_reports_public")
        .select("city, state, drug_name, risk_level, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      setTotalReports(data?.length || 0);

      const grouped: Record<string, { count: number; highRiskCount: number; cities: Set<string>; latest_drug: string | null }> = {};
      for (const r of data || []) {
        if (!r.state) continue;
        const key = r.state;
        if (!grouped[key]) {
          grouped[key] = { count: 0, highRiskCount: 0, cities: new Set(), latest_drug: r.drug_name };
        }
        grouped[key].count++;
        if (r.risk_level === "high") grouped[key].highRiskCount++;
        if (r.city) grouped[key].cities.add(r.city);
      }

      const sorted = Object.entries(grouped)
        .map(([state, val]) => ({
          state,
          count: val.count,
          highRiskCount: val.highRiskCount,
          cities: Array.from(val.cities).slice(0, 3),
          latest_drug: val.latest_drug,
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

  const maxCount = hotspots.length > 0 ? hotspots[0].count : 1;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-warning" />
          Counterfeit Hotspots
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalReports} anonymous reports — ranked by frequency.
        </p>
      </CardHeader>
      <CardContent>
        {hotspots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reports yet. Be the first to help warn others by reporting a suspicious pill.
          </p>
        ) : (
          <div className="space-y-3">
            {hotspots.map((h, i) => {
              const pct = Math.round((h.count / maxCount) * 100);
              const isHighRiskArea = h.highRiskCount >= 2 || h.highRiskCount / h.count >= 0.5;

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                        {i + 1}
                      </span>
                      <AlertTriangle className={cn(
                        "h-4 w-4 shrink-0",
                        isHighRiskArea ? "text-destructive" : h.count >= 3 ? "text-warning" : "text-muted-foreground"
                      )} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {h.state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isHighRiskArea && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          HIGH RISK
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs tabular-nums">
                        {h.count}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="ml-7 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isHighRiskArea
                            ? "bg-destructive"
                            : h.count >= 3
                              ? "bg-warning"
                              : "bg-primary/50"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <p className="ml-7 text-[11px] text-muted-foreground truncate">
                    {h.cities.length > 0 ? h.cities.join(", ") : "Location not specified"}
                    {h.latest_drug && ` · Latest: ${h.latest_drug}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
