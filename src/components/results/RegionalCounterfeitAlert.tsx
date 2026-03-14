import { AlertTriangle, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CounterfeitAlert {
  drug_name: string;
  state: string;
  city: string | null;
  risk_level: string | null;
  count: number;
  latest: string;
}

interface RegionalCounterfeitAlertProps {
  alerts: CounterfeitAlert[];
  className?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
  return `${Math.floor(days / 30)} month(s) ago`;
}

export function RegionalCounterfeitAlert({ alerts, className }: RegionalCounterfeitAlertProps) {
  if (!alerts || alerts.length === 0) return null;

  const totalReports = alerts.reduce((sum, a) => sum + a.count, 0);
  const hasHighRisk = alerts.some(a => a.risk_level === "high");

  return (
    <Card className={cn(
      "border-2",
      hasHighRisk ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5",
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={cn(
            "h-5 w-5",
            hasHighRisk ? "text-destructive" : "text-warning"
          )} />
          Regional Counterfeit Reports
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalReports} counterfeit report{totalReports !== 1 ? "s" : ""} for this substance in the last 90 days
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 rounded-lg bg-background/60 px-3 py-2.5"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {alert.city ? `${alert.city}, ${alert.state}` : alert.state}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Latest: {timeAgo(alert.latest)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {alert.risk_level === "high" && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  HIGH
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs tabular-nums">
                {alert.count} report{alert.count !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-1">
          Based on anonymous community reports. Always test with fentanyl strips and carry naloxone.
        </p>
      </CardContent>
    </Card>
  );
}
