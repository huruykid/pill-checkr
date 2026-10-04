// Daily sync of AGGREGATE overdose statistics (counts per area per period)
// into overdose_area_periods. These are not cases, incidents or alerts.
//
//   sf_ocme_monthly_deaths   Socrata jxrr-bmra  city  monthly deaths            CA (ODbL)
//   sf_ems_overdose_911      Socrata ed3a-sn39  city  weekly EMS overdose calls CA (PDDL)
//   la_county_zip_overdose   ArcGIS             zip   2018–19 / 2020–21 deaths by drug  CA
//   fresno_sheriff_coroner_annual  curated (PDF) county annual deaths: all / fentanyl / meth  CA
//
// Body options: {"only":["sf_ocme_monthly_deaths"]}
import {
  serviceClient, socrataAll, arcgisAll, upsertChunked, runSources, jsonResponse, readOptions,
  corsHeaders, isoDay, num, zip5,
} from "../_shared/sync.ts";
import { round5 } from "../_shared/geo.ts";
import { FRESNO_CORONER_ANNUAL, FRESNO_DOCS, FRESNO_EDITION } from "../_shared/curated/fresno_coroner_annual.ts";

const SHAPE_VERSION = 1;
type Row = Record<string, unknown>;

interface AreaRow {
  source_id: string; source_record_id: string;
  area_type: "state" | "county" | "city" | "zip" | "spa" | "district" | "neighborhood" | "tract";
  area_id: string; area_name: string | null; state: string | null;
  lat: number | null; lon: number | null;
  period_start: string; period_end: string; period_label: string | null;
  metric: "deaths" | "ems_calls" | "ed_visits" | "naloxone" | "hospitalizations";
  drug_category: string; value: number | null; rate: number | null;
  raw: Row; shape_version: number; synced_at: string;
}

const SF = { lat: 37.7749, lon: -122.4194 };

function monthEnd(isoStart: string): string {
  const d = new Date(isoStart + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------------------------------------------------------------------------
async function sfDeaths(supabase: ReturnType<typeof serviceClient>) {
  const SRC = "sf_ocme_monthly_deaths";
  const rows = await socrataAll<Row>("https://data.sf.gov/resource/jxrr-bmra.json", { $order: "month_start_date" });
  const out: AreaRow[] = [];
  for (const r of rows) {
    const start = isoDay(r.month_start_date);
    if (!start) continue;
    out.push({
      source_id: SRC, source_record_id: `sf|${start}|deaths|all`,
      area_type: "city", area_id: "san-francisco", area_name: "San Francisco", state: "CA", lat: SF.lat, lon: SF.lon,
      period_start: start, period_end: monthEnd(start),
      period_label: `${MONTHS[Number(start.slice(5, 7)) - 1]} ${start.slice(0, 4)}`,
      metric: "deaths", drug_category: "all", value: num(r.total_deaths), rate: null,
      raw: r, shape_version: SHAPE_VERSION, synced_at: new Date().toISOString(),
    });
  }
  const upserted = await upsertChunked(supabase, "overdose_area_periods", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted };
}

// ---------------------------------------------------------------------------
async function sfEms(supabase: ReturnType<typeof serviceClient>) {
  const SRC = "sf_ems_overdose_911";
  const rows = await socrataAll<Row>("https://data.sf.gov/resource/ed3a-sn39.json", { $order: "week_start_date" });
  const out: AreaRow[] = [];
  for (const r of rows) {
    const start = isoDay(r.week_start_date);
    if (!start) continue;
    out.push({
      source_id: SRC, source_record_id: `sf|${start}|ems_calls|all`,
      area_type: "city", area_id: "san-francisco", area_name: "San Francisco", state: "CA", lat: SF.lat, lon: SF.lon,
      period_start: start, period_end: addDays(start, 6),
      period_label: `${String(r.week ?? "").trim()} ${start.slice(0, 4)}`.trim() || null,
      metric: "ems_calls", drug_category: "all", value: num(r.total_overdose_related_911_calls), rate: null,
      raw: r, shape_version: SHAPE_VERSION, synced_at: new Date().toISOString(),
    });
  }
  const upserted = await upsertChunked(supabase, "overdose_area_periods", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted };
}

// ---------------------------------------------------------------------------
// LA County ZIP layer: two pooled periods × six categories per ZIP polygon.
const LA_PERIODS: [string, string, string, string][] = [
  // suffix, label, start, end
  ["18_19", "2018–19", "2018-01-01", "2019-12-31"],
  ["20_21", "2020–21", "2020-01-01", "2021-12-31"],
];
// field prefix per category (the layer truncates names at 10 characters)
const LA_FIELDS: Record<string, [string, string]> = {
  all: ["All18_19", "All20_21"],
  alcohol: ["Alco18_19", "Alcol20_21"],
  any_opioid: ["Opioid18_1", "Opioid20_2"],
  heroin: ["Heroin18_1", "Heroin20_2"],
  fentanyl: ["Fent18_19", "Fent20_21"],
  methamphetamine: ["Meth18_19", "Meth20_21"],
};

async function laZip(supabase: ReturnType<typeof serviceClient>) {
  const SRC = "la_county_zip_overdose";
  const feats = await arcgisAll<Row>(
    "https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Accidental_drug_overdose_deaths_by_Zip_Code/FeatureServer/0",
    "1=1", { outFields: "ZIPCODE,Zip,All18_19,Alco18_19,Opioid18_1,Heroin18_1,Fent18_19,Meth18_19,All20_21,Alcol20_21,Opioid20_2,Heroin20_2,Fent20_21,Meth20_21", geometry: false, centroid: true, orderBy: "FID" },
  );
  const out: AreaRow[] = [];
  let skipped = 0;
  for (const f of feats) {
    const r = f.attributes;
    const zip = zip5(r.ZIPCODE) ?? zip5(r.Zip);
    if (!zip) { skipped++; continue; }
    const lat = f.centroid ? round5(f.centroid.y) : null;
    const lon = f.centroid ? round5(f.centroid.x) : null;
    for (const [pi, [suffix, label, start, end]] of LA_PERIODS.entries()) {
      for (const [cat, fields] of Object.entries(LA_FIELDS)) {
        out.push({
          source_id: SRC, source_record_id: `${zip}|${suffix}|deaths|${cat}`,
          area_type: "zip", area_id: zip, area_name: `ZIP ${zip}`, state: "CA", lat, lon,
          period_start: start, period_end: end, period_label: label,
          metric: "deaths", drug_category: cat, value: num(r[fields[pi]]), rate: null,
          raw: { ZIPCODE: r.ZIPCODE }, shape_version: SHAPE_VERSION, synced_at: new Date().toISOString(),
        });
      }
    }
  }
  const upserted = await upsertChunked(supabase, "overdose_area_periods", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: feats.length, upserted, skipped, note: "pooled 2018-19 and 2020-21 periods" };
}

// ---------------------------------------------------------------------------
// Fresno County Sheriff-Coroner annual statistics. The county publishes only a
// PDF per year, so the numbers live in a curated module (see its header for
// how they were verified). Nothing is fetched; the job exists so the source
// goes through the same registry, enable flag and upsert path as the others.
const FRESNO = { lat: 36.738918, lon: -119.767884 }; // overdose_county_latest centroid for FIPS 06019

export function fresnoRows(now = new Date().toISOString()): AreaRow[] {
  return FRESNO_CORONER_ANNUAL.map((r) => ({
    source_id: "fresno_sheriff_coroner_annual", source_record_id: `06019|${r.year}|deaths|${r.category}`,
    area_type: "county", area_id: "06019", area_name: "Fresno County", state: "CA", lat: FRESNO.lat, lon: FRESNO.lon,
    period_start: `${r.year}-01-01`, period_end: `${r.year}-12-31`, period_label: String(r.year),
    metric: "deaths", drug_category: r.category, value: r.value, rate: null,
    raw: { document: FRESNO_DOCS[r.edition] ?? null, edition: r.edition, note: r.note },
    shape_version: SHAPE_VERSION, synced_at: now,
  }));
}

async function fresno(supabase: ReturnType<typeof serviceClient>) {
  const out = fresnoRows();
  const upserted = await upsertChunked(supabase, "overdose_area_periods", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: out.length, upserted, note: `curated from the Sheriff-Coroner ${FRESNO_EDITION} statistics PDF` };
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const supabase = serviceClient();
    const { only } = await readOptions(req);
    const results = await runSources([
      { id: "sf_ocme_monthly_deaths", run: () => sfDeaths(supabase) },
      { id: "sf_ems_overdose_911", run: () => sfEms(supabase) },
      { id: "la_county_zip_overdose", run: () => laZip(supabase) },
      { id: "fresno_sheriff_coroner_annual", run: () => fresno(supabase) },
    ], supabase, only);
    return jsonResponse({ ok: results.every((r) => r.ok), ms: Date.now() - started, results });
  } catch (e) {
    console.error("sync-area-stats:", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
