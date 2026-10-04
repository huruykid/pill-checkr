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
  region: string;                         // USPS state code, or "US" for national notices
  locality: string | null;                // "Philadelphia", "New York City" — null for statewide/national
  issuer: string | null;
  date_precision: "day" | "month" | "year";
}

// Newest first. Pass the person's state to pull their state's and national
// alerts ahead of other regions; nothing is hidden, only reordered.
export async function fetchExternalAlerts(limit = 40, state?: string | null): Promise<ExternalAlert[]> {
  const { data, error } = await db
    .from("external_alerts_public")
    .select("id, source_id, title, published_on, date_precision, url, pdf_url, image_url, summary, substances, severity, region, locality, issuer")
    .order("published_on", { ascending: false, nullsFirst: false })
    .limit(limit * 3);
  if (error) { console.error(error); return []; }
  const all = ((data as unknown as ExternalAlert[]) || []).map((a) => ({
    ...a,
    locality: a.locality ?? null, issuer: a.issuer ?? null, date_precision: a.date_precision ?? "day",
  }));
  const st = state ? state.toUpperCase() : null;
  const rank = (a: ExternalAlert) => (a.region === "US" ? 1 : st && a.region === st ? 0 : 2);
  const sorted = all.sort((a, b) => rank(a) - rank(b) || (b.published_on ?? "").localeCompare(a.published_on ?? ""));
  // The same CDC notice arrives through several relays (WA DOH, LA County);
  // keep the best-ranked copy of any title that repeats.
  const seen = new Set<string>();
  const out: ExternalAlert[] = [];
  for (const a of sorted) {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key); out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

// Medical-examiner / coroner drug deaths, rolling 12 months, aggregated per hex
// cell or county (external_deaths_recent_cells). Never individual records on the map.
export interface DeathCell {
  state: string | null;
  county: string | null;
  hex_cell: string | null;
  lat: number | null;
  lon: number | null;
  geo_precision: string;
  deaths: number;
  fentanyl_deaths: number;
  xylazine_deaths: number;
  medetomidine_deaths: number;
  latest_death: string | null;
}

export async function fetchDeathCells(state?: string | null): Promise<DeathCell[]> {
  let q = db.from("external_deaths_recent_cells")
    .select("state, county, hex_cell, lat, lon, geo_precision, deaths, fentanyl_deaths, xylazine_deaths, medetomidine_deaths, latest_death")
    .not("lat", "is", null).limit(5000);
  if (state) q = q.ilike("state", state);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return (data as unknown as DeathCell[]) || [];
}

// Nonfatal EMS / 911 overdose responses, last 30 days per hex cell.
export interface IncidentCell {
  state: string | null;
  city: string | null;
  hex_cell: string | null;
  lat: number | null;
  lon: number | null;
  geo_precision: string;
  incidents: number;
  naloxone_incidents: number | null;
  latest: string | null;
}

export async function fetchIncidentCells(state?: string | null): Promise<IncidentCell[]> {
  let q = db.from("external_incidents_recent_cells")
    .select("state, city, hex_cell, lat, lon, geo_precision, incidents, naloxone_incidents, latest")
    .not("lat", "is", null).limit(5000);
  if (state) q = q.ilike("state", state);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return (data as unknown as IncidentCell[]) || [];
}

// Aggregate overdose statistics per area and period (SF monthly deaths and
// weekly EMS calls, LA County deaths by ZIP and drug, and future county /
// state dashboards). These are counts, never case records.
export interface AreaPeriodStat {
  source_id: string;
  area_type: string;
  area_id: string;
  area_name: string | null;
  state: string | null;
  lat: number | null;
  lon: number | null;
  period_start: string;
  period_end: string;
  period_label: string | null;
  metric: "deaths" | "ems_calls" | "ed_visits" | "naloxone" | "hospitalizations";
  drug_category: string;
  value: number | null;
  rate: number | null;
}

export async function fetchAreaStats(opts: { state?: string | null; metric?: AreaPeriodStat["metric"]; limit?: number } = {}): Promise<AreaPeriodStat[]> {
  let q = db.from("overdose_area_periods_public")
    .select("source_id, area_type, area_id, area_name, state, lat, lon, period_start, period_end, period_label, metric, drug_category, value, rate")
    .order("period_end", { ascending: false }).limit(opts.limit ?? 2000);
  if (opts.state) q = q.ilike("state", opts.state);
  if (opts.metric) q = q.eq("metric", opts.metric);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return (data as unknown as AreaPeriodStat[]) || [];
}
