// External verified data (UNC Street Drug Analysis Lab, and future sources).
// One typed boundary over the external_* tables until the generated Supabase
// types are refreshed; every consumer imports from here, never queries directly.
import { supabase } from "@/integrations/supabase/client";

export interface ExternalSource {
  id: string;
  name: string;
  organization: string;
  homepage_url: string;
  license_note: string;
  attribution_text: string;
  description: string;
  last_synced_at: string | null;
}

export interface ExternalLabReport {
  id: string;
  source_id: string;
  substance_expected: string | null;
  substances_detected: string[] | null;   // lab's standardized names, priority-sorted
  substances_trace: string[] | null;      // trace-level detections, kept separate
  lab_flags: Record<string, boolean | null> | null;
  sample_type: string | null;
  is_pill: boolean;
  county: string | null;
  state: string | null;
  lat: number | null;
  lon: number | null;
  geo_precision: string;
  collected_on: string | null;
  image_url: string | null;
}

// Single cast boundary (tables not yet in generated Database types).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from(table: string): any };

export async function fetchExternalSources(): Promise<ExternalSource[]> {
  const { data, error } = await db
    .from("external_sources")
    .select("id, name, organization, homepage_url, license_note, attribution_text, description, last_synced_at")
    .eq("enabled", true);
  if (error) { console.error(error); return []; }
  return (data as unknown as ExternalSource[]) || [];
}

export async function fetchExternalReports(opts: { state?: string | null; limit?: number }): Promise<ExternalLabReport[]> {
  let q = db
    .from("external_reports_public")
    .select("id, source_id, substance_expected, substances_detected, substances_trace, lab_flags, sample_type, is_pill, county, state, lat, lon, geo_precision, collected_on, image_url")
    .order("collected_on", { ascending: false, nullsFirst: false })
    .limit(opts.limit ?? 50);
  if (opts.state) q = q.ilike("state", opts.state);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return (data as unknown as ExternalLabReport[]) || [];
}

/** True only when the flag is affirmatively true (never NULL-poisoned). */
export function flagTrue(flags: ExternalLabReport["lab_flags"], key: string): boolean {
  return flags?.[key] === true;
}


export interface ExternalStateCount { state: string; n: number; }

// States that actually have lab data, most first. Powers the lab-results state
// picker — national reference data, independent of the community location.
export async function fetchExternalStates(): Promise<ExternalStateCount[]> {
  const { data, error } = await db
    .from("external_reports_state_counts")
    .select("state, n")
    .order("n", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data as unknown as ExternalStateCount[]) || [];
}

// CDC/NCHS provisional overdose deaths, latest 12-month period per county,
// joined to county centroids. Suppressed counts (1-9) come through as null.
export interface OverdoseCounty {
  fips: string;
  state: string | null;
  county: string | null;
  period_end: string;
  deaths: number | null;
  deaths_prior: number | null;
  pct_pending: number | null;
  footnote: string | null;
  lat: number | null;
  lon: number | null;
}

export async function fetchOverdoseCounties(): Promise<OverdoseCounty[]> {
  const { data, error } = await db
    .from("overdose_county_latest")
    .select("fips, state, county, period_end, deaths, deaths_prior, pct_pending, footnote, lat, lon")
    .not("lat", "is", null)
    .limit(4000);
  if (error) { console.error(error); return []; }
  return (data as unknown as OverdoseCounty[]) || [];
}

// Early-warning alerts (CFSRE NPS Discovery and future sources): national
// notices about new substances entering the supply. Newest first.
export interface ExternalAlert {
  id: string;
  source_id: string;
  title: string;
  published_on: string | null;
  url: string | null;
  pdf_url: string | null;
  image_url: string | null;
  summary: string | null;
  substances: string[];
  severity: "danger" | "warning" | "info";
  region: string;
}

export async function fetchExternalAlerts(limit = 40): Promise<ExternalAlert[]> {
  const { data, error } = await db
    .from("external_alerts_public")
    .select("id, source_id, title, published_on, url, pdf_url, image_url, summary, substances, severity, region")
    .order("published_on", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) { console.error(error); return []; }
  return (data as unknown as ExternalAlert[]) || [];
}
