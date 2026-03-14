import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, FlaskConical, Loader2 } from "lucide-react";

export type ImportSource = "curated" | "dailymed";

export interface ApiImportParams {
  source: ImportSource;
  category: string;
  limit: number;
  dryRun: boolean;
}

export interface ApiImportResult {
  source: ImportSource;
  dryRun: boolean;
  category: string;
  limit: number;
  processed: number;
  inserted: number;
  updated: number;
  duplicatesSkipped: number;
  imagesAdded: number;
  enriched: number;
  apiErrors: number;
  completedAt: string;
}

export interface ImportStats {
  total: number;
  manual: number;
  curated: number;
  dailymed: number;
  lastSyncedAt: string | null;
}

interface ApiImportTabProps {
  isImporting: boolean;
  latestImport: ApiImportResult | null;
  stats: ImportStats | null;
  onImport: (params: ApiImportParams) => Promise<void>;
}

const CATEGORIES = [
  { value: "all", label: "All Core Categories" },
  { value: "opioids", label: "Opioids" },
  { value: "benzos", label: "Benzodiazepines" },
  { value: "stimulants", label: "Stimulants" },
  { value: "antibiotics", label: "Antibiotics" },
  { value: "cardiovascular", label: "Cardiovascular" },
  { value: "diabetes", label: "Diabetes" },
  { value: "psychiatric", label: "Psychiatric" },
  { value: "gi", label: "GI Treatments" },
  { value: "antihistamines", label: "Antihistamines" },
  { value: "thyroid", label: "Thyroid" },
  { value: "muscle_relaxants", label: "Muscle Relaxants" },
  { value: "supplements", label: "Supplements" },
  { value: "mdma_ecstasy", label: "MDMA / Ecstasy" },
];

export function ApiImportTab({ isImporting, latestImport, stats, onImport }: ApiImportTabProps) {
  const [source, setSource] = useState<ImportSource>("curated");
  const [category, setCategory] = useState("opioids");
  const [limit, setLimit] = useState("150");

  const runImport = async (dryRun: boolean) => {
    await onImport({
      source,
      category,
      limit: Math.max(1, Math.min(500, Number(limit) || 150)),
      dryRun,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total References</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Manual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.manual ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Curated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.curated ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">DailyMed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.dailymed ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            API Import Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={(value: ImportSource) => setSource(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curated">Curated Dataset (Primary import)</SelectItem>
                  <SelectItem value="dailymed">DailyMed (Enrichment)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{source === "curated" ? "Category" : "Mode"}</Label>
              {source === "curated" ? (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value="Enrich existing references" readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label>{source === "curated" ? "Import limit" : "Enrichment limit"}</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => runImport(true)} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              Dry Run
            </Button>
            <Button onClick={() => runImport(false)} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Run Import
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{isImporting ? "Import in progress..." : "Latest run"}</span>
              <span>
                {latestImport?.completedAt
                  ? new Date(latestImport.completedAt).toLocaleString()
                  : stats?.lastSyncedAt
                    ? `Last sync: ${new Date(stats.lastSyncedAt).toLocaleString()}`
                    : "No sync yet"}
              </span>
            </div>
            <Progress value={isImporting ? 45 : latestImport ? 100 : 0} />
          </div>
        </CardContent>
      </Card>

      {latestImport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Import Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
            <p><span className="text-muted-foreground">Source:</span> {latestImport.source}</p>
            <p><span className="text-muted-foreground">Processed:</span> {latestImport.processed}</p>
            <p><span className="text-muted-foreground">Inserted:</span> {latestImport.inserted}</p>
            <p><span className="text-muted-foreground">Updated:</span> {latestImport.updated}</p>
            <p><span className="text-muted-foreground">Enriched:</span> {latestImport.enriched}</p>
            <p><span className="text-muted-foreground">Duplicates skipped:</span> {latestImport.duplicatesSkipped}</p>
            <p><span className="text-muted-foreground">Images added:</span> {latestImport.imagesAdded}</p>
            <p><span className="text-muted-foreground">API errors:</span> {latestImport.apiErrors}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
