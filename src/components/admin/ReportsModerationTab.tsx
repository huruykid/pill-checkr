import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, EyeOff, Eye, MapPin, FlaskConical } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Report = Database["public"]["Tables"]["counterfeit_reports"]["Row"];

/**
 * Moderation queue for community alerts. Admins see the full base table
 * (including notes, which never reach the public view) and toggle `hidden` —
 * both public views filter hidden = false, so hiding removes a report from
 * the feed, the map, and the API instantly.
 */
export function ReportsModerationTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"visible" | "hidden" | "all">("visible");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("counterfeit_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("hidden", filter === "hidden");
      const { data, error } = await q;
      if (error) throw error;
      setReports(data ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Could not load reports");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const setHidden = async (id: string, hidden: boolean) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from("counterfeit_reports")
        .update({ hidden })
        .eq("id", id);
      if (error) throw error;
      setReports((rs) => rs.map((r) => (r.id === id ? { ...r, hidden } : r)));
      toast.success(hidden ? "Report hidden from the public feed" : "Report restored to the public feed");
    } catch (e) {
      console.error(e);
      toast.error("Update failed");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["visible", "hidden", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No reports here.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className={r.hidden ? "opacity-60" : undefined}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {r.drug_name || "Unknown drug"}
                      {r.imprint ? ` · "${r.imprint}"` : ""}
                    </span>
                    {r.hidden && <Badge variant="destructive">Hidden</Badge>}
                    {r.strip_result && r.strip_result !== "not_tested" && (
                      <Badge variant="secondary" className="gap-1">
                        <FlaskConical className="h-3 w-3" />
                        strip {r.strip_result}
                      </Badge>
                    )}
                    <Badge variant="outline">{r.evidence_tier}</Badge>
                    {r.report_type === "overdose" && <Badge variant="destructive">overdose</Badge>}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {[r.city, r.state].filter(Boolean).join(", ") || "No location"}
                    {" · "}
                    {new Date(r.created_at).toLocaleString()}
                    {" · "}
                    {r.source || "app"}
                  </p>
                  {r.notes && (
                    <p className="max-w-xl break-words text-sm text-muted-foreground">{r.notes}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={r.hidden ? "outline" : "destructive"}
                  disabled={processing === r.id}
                  onClick={() => setHidden(r.id, !r.hidden)}
                  className="gap-1.5"
                >
                  {processing === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : r.hidden ? (
                    <>
                      <Eye className="h-4 w-4" /> Unhide
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" /> Hide
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
