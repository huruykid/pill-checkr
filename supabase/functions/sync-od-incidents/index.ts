// Hourly sync of nonfatal EMS / 911 overdose responses into external_incidents.
//
//   seattle_fire_911         Socrata  real-time  dispatch type "Medic Response- Overdose"  WA
//   cincinnati_fire_ems      Socrata  daily      CAD type HEROIN OD / OVERDOSE               OH
//   tempe_fire_opioid        ArcGIS   continuous probable opioid use + naloxone              AZ
//   baltimore_fire_naloxone  ArcGIS   monthly    naloxone given, daily count per ZIP         MD
//
// A dispatch type is not a confirmed overdose. These rows power a "recent
// activity" layer and spike detection, never a diagnosis. Addresses are dropped
// and points are reduced to an H3 res-6 cell before storage.
// Body options: {"only":["seattle_fire_911"],"full":true}
import {
  serviceClient, socrataAll, arcgisAll, upsertChunked, latestDate, runSources, jsonResponse, readOptions,
  corsHeaders, isoDay, str, zip5, daysAgo,
} from "../_shared/sync.ts";
import { hexFromPoint, countyGeo, loadCountyCentroids, tidyPlace, type CountyCentroids, type Geo } from "../_shared/geo.ts";

const SHAPE_VERSION = 1;
const OVERLAP_DAYS = 3;
const FIRST_RUN_DAYS = 400;   // ~13 months so the 12-month comparisons work from day one
const DROP_KEYS = /^(address.*|incident_street|age|patient_.*|gender|sex|latitude.*|longitude.*|report_location|beat|objectid)$/i;

type Row = Record<string, unknown>;

function scrub(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) if (!DROP_KEYS.test(k) && !k.startsWith(":@")) out[k] = v;
  return out;
}

interface IncidentRow {
  source_id: string; source_record_id: string; occurred_at: string | null; occurred_on: string | null;
  incident_type: "ems_overdose" | "ems_opioid" | "naloxone_administered" | "911_overdose";
  naloxone: boolean | null; count: number;
  city: string | null; county: string | null; state: string | null; zip: string | null;
  hex_cell: string | null; lat: number | null; lon: number | null; geo_precision: Geo["geo_precision"];
  raw: Row; shape_version: number; synced_at: string;
}

function tsIso(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(v) ? v : v + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const sinceFor = async (supabase: ReturnType<typeof serviceClient>, source: string, full: boolean) => {
  if (full) return daysAgo(FIRST_RUN_DAYS);
  const latest = await latestDate(supabase, "external_incidents", source, "occurred_on");
  if (!latest) return daysAgo(FIRST_RUN_DAYS);
  const d = new Date(latest); d.setUTCDate(d.getUTCDate() - OVERLAP_DAYS);
  return d.toISOString().slice(0, 10);
};

function row(
  source_id: string, id: string, occurred: string | null, type: IncidentRow["incident_type"], naloxone: boolean | null,
  place: { city?: unknown; county: string | null; state: string; zip?: unknown }, geo: Geo, raw: Row, count = 1,
): IncidentRow {
  return {
    source_id, source_record_id: id, occurred_at: occurred, occurred_on: occurred ? occurred.slice(0, 10) : null,
    incident_type: type, naloxone, count,
    city: tidyPlace(place.city), county: place.county, state: place.state, zip: zip5(place.zip),
    hex_cell: geo.hex_cell, lat: geo.lat, lon: geo.lon, geo_precision: geo.geo_precision,
    raw: scrub(raw), shape_version: SHAPE_VERSION, synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
async function seattle(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "seattle_fire_911";
  const since = await sinceFor(supabase, SRC, full);
  const rows = await socrataAll<Row>("https://data.seattle.gov/resource/kzjm-xkqj.json", {
    $select: "incident_number,datetime,type,latitude,longitude",
    $where: `datetime >= '${since}T00:00:00' AND upper(type) like '%OVERDOSE%'`,
    $order: "datetime",
  });
  const out: IncidentRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const id = str(r.incident_number);
    if (!id) { skipped++; continue; }
    const geo = hexFromPoint(r.latitude, r.longitude) ?? countyGeo(cc, "WA", "King");
    out.push(row(SRC, id, tsIso(r.datetime), "911_overdose", null, { city: "Seattle", county: "King", state: "WA" }, geo, r));
  }
  const upserted = await upsertChunked(supabase, "external_incidents", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
async function cincinnati(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "cincinnati_fire_ems";
  const since = await sinceFor(supabase, SRC, full);
  const rows = await socrataAll<Row>("https://data.cincinnati-oh.gov/resource/vnsz-a3wp.json", {
    $select: "event_number,create_time_incident,incident_type_id,incident_type_desc,disposition_text,neighborhood,latitude_x,longitude_x",
    $where: `create_time_incident >= '${since}T00:00:00' AND (upper(incident_type_desc) like '%OVERDOSE%' OR upper(incident_type_desc) like '%HEROIN%' OR upper(incident_type_desc) like '%OPIOID%')`,
    $order: "create_time_incident",
  });
  const out: IncidentRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const id = str(r.event_number);
    if (!id) { skipped++; continue; }
    const desc = String(r.incident_type_desc ?? "").toUpperCase();
    const type: IncidentRow["incident_type"] = /HEROIN|OPIOID/.test(desc) ? "ems_opioid" : "ems_overdose";
    const geo = hexFromPoint(r.latitude_x, r.longitude_x) ?? countyGeo(cc, "OH", "Hamilton");
    out.push(row(SRC, id, tsIso(r.create_time_incident), type, null, { city: "Cincinnati", county: "Hamilton", state: "OH" }, geo, r));
  }
  const upserted = await upsertChunked(supabase, "external_incidents", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
async function tempe(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "tempe_fire_opioid";
  const since = await sinceFor(supabase, SRC, full);
  const feats = await arcgisAll<Row>(
    "https://services.arcgis.com/lQySeXwbBg53XWDi/arcgis/rest/services/Opioid_Calls/FeatureServer/0",
    `Incident_Date >= DATE '${since}'`,
    { outFields: "OBJECTID,Incident_Date,Opioid_Use,Narcan_Given,Latitude_Random,Longitude_Random", geometry: false, orderBy: "OBJECTID" },
  );
  const out: IncidentRow[] = [];
  let skipped = 0;
  for (const f of feats) {
    const r = f.attributes;
    const when = typeof r.Incident_Date === "number" ? new Date(r.Incident_Date).toISOString() : null;
    if (!when) { skipped++; continue; }
    const nal = r.Narcan_Given === "Yes" ? true : r.Narcan_Given === "No" ? false : null;
    const type: IncidentRow["incident_type"] = r.Opioid_Use === "Yes" ? "ems_opioid" : nal ? "naloxone_administered" : "ems_overdose";
    const geo = hexFromPoint(r.Latitude_Random, r.Longitude_Random) ?? countyGeo(cc, "AZ", "Maricopa");
    out.push(row(SRC, String(r.OBJECTID), when, type, nal, { city: "Tempe", county: "Maricopa", state: "AZ" }, geo, r));
  }
  const upserted = await upsertChunked(supabase, "external_incidents", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: feats.length, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
async function baltimore(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "baltimore_fire_naloxone";
  // Upstream updates monthly and has no server-side date filter: once a day is plenty.
  if (!full) {
    const { data } = await supabase.from("external_sources").select("last_synced_at").eq("id", SRC).maybeSingle();
    const last = data?.last_synced_at ? new Date(data.last_synced_at).getTime() : 0;
    if (last && Date.now() - last < 20 * 3600e3) return { fetched: 0, upserted: 0, skipped: 0, note: "checked within 20h" };
  }
  const since = await sinceFor(supabase, SRC, full);
  // Incident_Date is a string ("4/30/2026"); pull everything and filter client-side (~17k rows).
  const feats = await arcgisAll<Row>(
    "https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/Baltimore_City_Fire_Department_Clinician_Administered_Naloxone_new/FeatureServer/0",
    "1=1", { outFields: "ObjectId,Incident_Date,Incident_Postal_Code,BCFD_Clinician_Naloxone_Administration_Occurrence", geometry: false, orderBy: "ObjectId" },
  );
  const geo = countyGeo(cc, "MD", "Baltimore city") ;
  const fallback = geo.lat ? geo : countyGeo(cc, "MD", "Baltimore");
  const out: IncidentRow[] = [];
  let skipped = 0;
  for (const f of feats) {
    const r = f.attributes;
    const day = isoDay(r.Incident_Date);
    if (!day || day < since) { skipped++; continue; }
    const n = Number(r.BCFD_Clinician_Naloxone_Administration_Occurrence ?? 1) || 1;
    const zip = zip5(r.Incident_Postal_Code);
    out.push(row(SRC, String(r.ObjectId), `${day}T00:00:00.000Z`, "naloxone_administered", true,
      { city: "Baltimore", county: "Baltimore city", state: "MD", zip }, { ...fallback, geo_precision: zip ? "zip" : fallback.geo_precision }, r, n));
  }
  const upserted = await upsertChunked(supabase, "external_incidents", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: feats.length, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const supabase = serviceClient();
    const { only, full } = await readOptions(req);
    const cc = await loadCountyCentroids(supabase);
    const results = await runSources([
      { id: "seattle_fire_911", run: () => seattle(supabase, cc, full) },
      { id: "cincinnati_fire_ems", run: () => cincinnati(supabase, cc, full) },
      { id: "tempe_fire_opioid", run: () => tempe(supabase, cc, full) },
      { id: "baltimore_fire_naloxone", run: () => baltimore(supabase, cc, full) },
    ], supabase, only);
    return jsonResponse({ ok: results.every((r) => r.ok), ms: Date.now() - started, results });
  } catch (e) {
    console.error("sync-od-incidents:", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
