import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { SEOHead, makeWebPage } from "@/components/shared/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  AlertTriangle,
  Calendar,
  MapPin,
  Loader2,
  Activity,
  Shield,
  Search,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Report {
  created_at: string;
  risk_level: string | null;
  imprint_text: string | null;
  color: string | null;
  shape: string | null;
}

interface CounterfeitReport {
  created_at: string;
  risk_level: string | null;
  drug_name: string | null;
  city: string | null;
  state: string | null;
}

const RISK_COLORS: Record<string, string> = {
  high: "hsl(0, 75%, 45%)",
  medium: "hsl(45, 95%, 45%)",
  low: "hsl(140, 60%, 40%)",
  unknown: "hsl(0, 0%, 60%)",
};

export default function Trends() {
  const [reports, setReports] = useState<Report[]>([]);
  const [alerts, setAlerts] = useState<CounterfeitReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [zipFilter, setZipFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, alertsRes] = await Promise.all([
        supabase
          .from("reports")
          .select("created_at, risk_level, imprint_text, color, shape")
          .gte("created_at", dateFrom + "T00:00:00Z")
          .lte("created_at", dateTo + "T23:59:59Z")
          .order("created_at", { ascending: true }),
        supabase
          .from("counterfeit_reports_public")
          .select("created_at, risk_level, drug_name, city, state")
          .gte("created_at", dateFrom + "T00:00:00Z")
          .lte("created_at", dateTo + "T23:59:59Z")
          .order("created_at", { ascending: false }),
      ]);

      setReports(reportsRes.data || []);
      setAlerts(alertsRes.data || []);
    } catch (e) {
      console.error("Error fetching trends data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyFilters = () => {
    fetchData();
  };

  // Volume over time (group by week)
  const volumeData = useMemo(() => {
    const buckets: Record<string, { total: number; high: number }> = {};
    reports.forEach((r) => {
      const d = new Date(r.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!buckets[key]) buckets[key] = { total: 0, high: 0 };
      buckets[key].total++;
      if (r.risk_level === "high") buckets[key].high++;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        checks: v.total,
        highRisk: v.high,
      }));
  }, [reports]);

  // Most checked imprints
  const imprintData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const imprint = r.imprint_text?.trim() || "Unknown";
      counts[imprint] = (counts[imprint] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [reports]);

  // Risk level distribution
  const riskData = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    reports.forEach((r) => {
      const level = r.risk_level || "unknown";
      counts[level] = (counts[level] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: RISK_COLORS[name] || RISK_COLORS.unknown,
      }));
  }, [reports]);

  // Stats
  const totalChecks = reports.length;
  const highRiskCount = reports.filter((r) => r.risk_level === "high").length;
  const highRiskPct = totalChecks > 0 ? Math.round((highRiskCount / totalChecks) * 100) : 0;
  const recentAlerts = alerts.slice(0, 5);

  return (
    <Layout>
      <SEOHead
        title="Trends & Analytics | Pill Checkr"
        description="Anonymized pill check trends, risk distribution, and community alerts. Monitor counterfeit drug activity in your area."
        path="/trends"
        jsonLd={makeWebPage("Trends & Analytics", "/trends", "View anonymized pill check trends and community alerts.")}
      />
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              Trends & Analytics
            </div>
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Community Trends</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Anonymized, aggregate data from pill checks across the platform.
              No personal information is ever shared.
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5" /> From
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5" /> To
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[160px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5" /> ZIP Code
                  </Label>
                  <Input
                    placeholder="e.g. 90210"
                    value={zipFilter}
                    onChange={(e) => setZipFilter(e.target.value)}
                    className="w-[120px]"
                    maxLength={10}
                  />
                </div>
                <Button onClick={handleApplyFilters} className="gap-2">
                  <Search className="h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Activity className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">{totalChecks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Checks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-destructive" />
                    <p className="text-3xl font-bold">{highRiskCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">High Risk</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Shield className="h-5 w-5 mx-auto mb-2 text-secondary" />
                    <p className="text-3xl font-bold">{highRiskPct}%</p>
                    <p className="text-xs text-muted-foreground">High Risk Rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold">{alerts.length}</p>
                    <p className="text-xs text-muted-foreground">Community Alerts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts row 1 */}
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                {/* Line chart - volume over time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Pill Check Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {volumeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={volumeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line
                            type="monotone"
                            dataKey="checks"
                            name="All Checks"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="highRisk"
                            name="High Risk"
                            stroke="hsl(var(--secondary))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                        No data for selected period
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bar chart - top imprints */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Most Checked Imprints
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {imprintData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={imprintData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 10 }}
                            width={80}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="count" name="Checks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                        No imprint data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Charts row 2 */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Donut chart - risk distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PieChart className="h-4 w-4 text-primary" />
                      Risk Level Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {riskData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <RechartsPie>
                          <Pie
                            data={riskData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {riskData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                        No risk data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent community alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Recent Community Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentAlerts.length > 0 ? (
                      <div className="space-y-3">
                        {recentAlerts.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-lg border border-border p-3"
                          >
                            <div
                              className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  RISK_COLORS[a.risk_level || "unknown"],
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {a.drug_name || "Unknown substance"}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {a.city && (
                                  <Badge variant="outline" className="text-xs">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {a.city}
                                    {a.state ? `, ${a.state}` : ""}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(a.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                        No community alerts in this period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Privacy note */}
              <div className="mt-6 rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  <Shield className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                  All data is anonymized and aggregated. No personal information or exact locations are shared.
                  Reports without user accounts cannot be linked to individuals.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
