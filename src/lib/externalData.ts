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
  substances_detected: string[] | null;
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
    .select("id, source_id, substance_expected, substances_detected, lab_flags, sample_type, is_pill, county, state, lat, lon, geo_precision, collected_on, image_url")
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
