// Daily sync of medical-examiner / coroner drug deaths into external_deaths.
//
// Sources (all open data, each verified reachable from the Supabase runtime):
//   cook_county_me      Socrata  daily    point -> hex          IL
//   santa_clara_me      Socrata  nightly  point -> hex          CA
//   san_diego_me        Socrata  monthly  zip -> county         CA
//   connecticut_ocme    Socrata  annual   town centroid         CT
//   allegheny_me        CKAN     monthly  zip -> county         PA
//   sacramento_coroner  ArcGIS   ~daily   zip -> county         CA (fentanyl-only by design)
//
// Privacy: no names, case numbers, ages, sex, race, street addresses or exact
// points are stored. Upstream case numbers are hashed to make a stable upsert key.
// Body options: {"only":["cook_county_me"],"full":true}
import {
  serviceClient, socrataAll, arcgisAll, fetchJson, upsertChunked, latestDate, runSources,
  jsonResponse, readOptions, corsHeaders, isoDay, isoDayFromEpochMs, str, zip5,
} from "../_shared/sync.ts";
import { parseSubstances, flagsFor, DRUG_DEATH_RE } from "../_shared/substances.ts";
import {
  hexFromPoint, countyGeo, cityGeo, loadCountyCentroids, tidyPlace, type CountyCentroids, type Geo,
} from "../_shared/geo.ts";

const SHAPE_VERSION = 1;
const OVERLAP_DAYS = 120;       // re-pull this far back so late toxicology updates land
const FIRST_RUN_FROM = "2018-01-01";
const DROP_KEYS = /^(age|age_in_years|age_group.*|sex|gender|race|ethnic.*|latino|casenumber|case_number|casenum|me_case_nu|incident_street|address.*|decedent_zip|res_zip|residence.*|resident_.*|marital.*|homeless|incident_location|death_place|objectid|_id)$/i;

type Row = Record<string, unknown>;

function scrub(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) if (!DROP_KEYS.test(k) && !k.startsWith(":@")) out[k] = v;
  return out;
}

async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function manner(v: unknown): string | null {
  const s = str(v);
  return s ? s.toLowerCase() : null;
}

interface DeathRow {
  source_id: string; source_record_id: string; death_date: string | null; date_precision: "day" | "month" | "year";
  manner: string | null; substances: string[]; flags: Record<string, boolean>; cause_text: string | null;
  city: string | null; county: string | null; state: string | null; zip: string | null;
  hex_cell: string | null; lat: number | null; lon: number | null; geo_precision: Geo["geo_precision"];
  raw: Row; shape_version: number; synced_at: string;
}

function build(
  source_id: string, id: string, death_date: string | null, mannerText: unknown, cause: string | null,
  place: { city?: unknown; county: string | null; state: string; zip?: unknown }, geo: Geo, raw: Row,
  extraFlags: Record<string, boolean> = {}, precision: DeathRow["date_precision"] = "day",
): DeathRow {
  const substances = parseSubstances(cause);
  // A county's own flag (e.g. San Diego "Opioid-Fentanyl", Sacramento's
  // fentanyl-only dataset) names the substance even when the text does not.
  if (extraFlags.fentanyl && !substances.includes("Fentanyl")) substances.unshift("Fentanyl");
  return {
    source_id, source_record_id: id, death_date, date_precision: precision,
    manner: manner(mannerText), substances, flags: { ...flagsFor(substances), ...extraFlags },
    cause_text: cause ? cause.replace(/\s+/g, " ").trim().slice(0, 600) : null,
    city: tidyPlace(place.city), county: place.county, state: place.state, zip: zip5(place.zip),
    hex_cell: geo.hex_cell, lat: geo.lat, lon: geo.lon, geo_precision: geo.geo_precision,
    raw: scrub(raw), shape_version: SHAPE_VERSION, synced_at: new Date().toISOString(),
  };
}

const sinceFor = async (supabase: ReturnType<typeof serviceClient>, source: string, full: boolean) => {
  if (full) return FIRST_RUN_FROM;
  const latest = await latestDate(supabase, "external_deaths", source, "death_date");
  if (!latest) return FIRST_RUN_FROM;
  const d = new Date(latest); d.setUTCDate(d.getUTCDate() - OVERLAP_DAYS);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// Cook County, IL
// ---------------------------------------------------------------------------
async function cook(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "cook_county_me";
  const since = await sinceFor(supabase, SRC, full);
  const rows = await socrataAll<Row>("https://datacatalog.cookcountyil.gov/resource/cjeq-bs86.json", {
    $select: "casenumber,death_date,manner,primarycause,primarycause_linea,primarycause_lineb,primarycause_linec,secondarycause,opioids,incident_city,incident_zip,latitude,longitude",
    $where: `death_date >= '${since}T00:00:00' AND manner in('ACCIDENT','UNDETERMINED') AND (opioids=true OR upper(primarycause) like '%TOXICITY%' OR upper(primarycause) like '%INTOXICATION%' OR upper(primarycause) like '%OVERDOSE%' OR upper(secondarycause) like '%TOXICITY%')`,
    $order: "death_date",
  });
  const out: DeathRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const cause = [r.primarycause, r.primarycause_linea, r.primarycause_lineb, r.primarycause_linec, r.secondarycause]
      .filter((s) => typeof s === "string" && s).join("; ");
    if (!DRUG_DEATH_RE.test(cause) && r.opioids !== true) { skipped++; continue; }
    const cn = str(r.casenumber);
    if (!cn) { skipped++; continue; }
    const geo = hexFromPoint(r.latitude, r.longitude) ?? countyGeo(cc, "IL", "Cook");
    out.push(build(SRC, await sha(cn), isoDay(r.death_date), r.manner, cause,
      { city: r.incident_city, county: "Cook", state: "IL", zip: r.incident_zip }, geo, r,
      r.opioids === true ? { any_opioid: true } : {}));
  }
  const upserted = await upsertChunked(supabase, "external_deaths", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
// Santa Clara County, CA
// ---------------------------------------------------------------------------
async function santaClara(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "santa_clara_me";
  const since = await sinceFor(supabase, SRC, full);
  const rows = await socrataAll<Row>("https://data.sccgov.org/resource/s3fb-yrjp.json", {
    $select: "case_number,manner_of_death,death_date,death_city,death_zip,incident_city,incident_zip,cause_of_death,other_significant_condition,latitude,longitude",
    $where: `death_date >= '${since}' AND manner_of_death in('Accident','Undetermined') AND (upper(cause_of_death) like '%TOXICITY%' OR upper(cause_of_death) like '%INTOXICATION%' OR upper(cause_of_death) like '%OVERDOSE%' OR upper(cause_of_death) like '%FENTANYL%' OR upper(cause_of_death) like '%DRUG%')`,
    $order: "death_date",
  });
  const out: DeathRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const cause = [r.cause_of_death, r.other_significant_condition].filter((s) => typeof s === "string" && s && s !== "N/A").join("; ");
    if (!DRUG_DEATH_RE.test(cause)) { skipped++; continue; }
    const cn = str(r.case_number);
    if (!cn) { skipped++; continue; }
    const geo = hexFromPoint(r.latitude, r.longitude) ?? countyGeo(cc, "CA", "Santa Clara");
    const city = str(r.incident_city) ?? str(r.death_city);
    const zip = zip5(r.incident_zip) ?? zip5(r.death_zip);
    out.push(build(SRC, await sha(cn), isoDay(r.death_date), r.manner_of_death, cause,
      { city, county: "Santa Clara", state: "CA", zip }, geo, r));
  }
  const upserted = await upsertChunked(supabase, "external_deaths", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
// San Diego County, CA
// ---------------------------------------------------------------------------
async function sanDiego(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "san_diego_me";
  const since = await sinceFor(supabase, SRC, full);
  const rows = await socrataAll<Row>("https://data.sandiegocounty.gov/resource/jkvb-n4p7.json", {
    $select: "row_number,death_date,manner,manner_sub_type,opioid_related,cod_string,contributing_conditions,how_injury_occurred,event_city,event_zip,death_city,death_zip",
    $where: `death_date >= '${since}' AND manner in('Accident','Undetermined') AND (opioid_related like 'Opioid%' OR manner_sub_type like 'Drug%' OR upper(cod_string) like '%TOXICITY%' OR upper(cod_string) like '%INTOXICATION%' OR upper(cod_string) like '%OVERDOSE%' OR upper(cod_string) like '%FENTANYL%')`,
    $order: "death_date",
  });
  const geo = countyGeo(cc, "CA", "San Diego");
  const out: DeathRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const cause = [r.cod_string, r.contributing_conditions].filter((s) => typeof s === "string" && s).join("; ");
    const opioid = typeof r.opioid_related === "string" && r.opioid_related.startsWith("Opioid");
    if (!DRUG_DEATH_RE.test(cause) && !opioid) { skipped++; continue; }
    const id = str(r.row_number);
    if (!id) { skipped++; continue; }
    const extra: Record<string, boolean> = {};
    if (opioid) extra.any_opioid = true;
    if (r.opioid_related === "Opioid-Fentanyl") extra.fentanyl = true;
    out.push(build(SRC, id, isoDay(r.death_date), r.manner, cause,
      { city: str(r.event_city) ?? str(r.death_city), county: "San Diego", state: "CA", zip: zip5(r.event_zip) ?? zip5(r.death_zip) },
      geo, r, extra));
  }
  const upserted = await upsertChunked(supabase, "external_deaths", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
// Connecticut OCME (annual; full pull every time, it is ~13k rows)
// ---------------------------------------------------------------------------
const CT_FLAG_COLS: [string, string][] = [
  ["fentanyl", "Fentanyl"], ["fentanylanalogue", "Fentanyl analogs"], ["heroin", "Heroin"], ["cocaine", "Cocaine"],
  ["meth_amphetamine", "Methamphetamine"], ["amphet", "Amphetamine"], ["xylazine", "Xylazine"], ["oxycodone", "Oxycodone"],
  ["oxymorphone", "Oxymorphone"], ["hydrocodone", "Hydrocodone"], ["hydromorphone", "Hydromorphone"], ["methadone", "Methadone"],
  ["tramad", "Tramadol"], ["morphine_notheroin", "Morphine"], ["benzodiazepine", "Benzodiazepines"], ["gabapentin", "Gabapentin"],
  ["ethanol", "Alcohol"],
];
async function connecticut(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "connecticut_ocme";
  // Annual dataset: re-pull monthly (or on demand), not every night.
  if (!full) {
    const { data } = await supabase.from("external_sources").select("last_synced_at").eq("id", SRC).maybeSingle();
    const last = data?.last_synced_at ? new Date(data.last_synced_at).getTime() : 0;
    if (last && Date.now() - last < 30 * 864e5) return { fetched: 0, upserted: 0, skipped: 0, note: "annual dataset, refreshed monthly" };
  }
  const rows = await socrataAll<Row>("https://data.ct.gov/resource/rybz-nyjw.json", { $order: "date,cod,injurycity" });
  const out: DeathRow[] = [];
  const seen = new Map<string, number>();
  let skipped = 0;
  for (const r of rows) {
    const date = isoDay(r.date);
    const cause = str(r.cod) ?? "";
    const named = new Set(parseSubstances(cause));
    for (const [col, name] of CT_FLAG_COLS) if (r[col] === "Y") named.add(name);
    if (named.size === 0 && !DRUG_DEATH_RE.test(cause)) { skipped++; continue; }
    const county = tidyPlace(str(r.injurycounty) ?? str(r.deathcounty) ?? str(r.residencecounty));
    const city = str(r.injurycity) ?? str(r.deathcity);
    const g = (r.injurycitygeo ?? r.deathcitygeo) as { latitude?: string; longitude?: string } | undefined;
    const geo = (g && cityGeo(g.latitude, g.longitude)) ?? countyGeo(cc, "CT", county);
    // No upstream id: hash the stable public fields, then disambiguate the
    // rare exact duplicates (same day, town, cause, age, sex) with a running
    // index so both deaths are kept. Rows are ordered by date upstream, so
    // the index is stable between runs.
    const base = await sha([date, cause, city, r.residencecity, r.injuryplace, r.descriptionofinjury, r.age, r.sex, r.race, r.mannerofdeath].map((v) => String(v ?? "")).join("|"));
    const n = (seen.get(base) ?? 0) + 1; seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    const substances = [...named];
    const row = build(SRC, id, date, r.mannerofdeath, cause, { city, county, state: "CT" }, geo, r,
      r.anyopioid === "Y" ? { any_opioid: true } : {});
    row.substances = substances;
    row.flags = { ...flagsFor(substances), ...(r.anyopioid === "Y" ? { any_opioid: true } : {}) };
    out.push(row);
  }
  const upserted = await upsertChunked(supabase, "external_deaths", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: rows.length, upserted, skipped, note: "full annual dataset" };
}

// ---------------------------------------------------------------------------
// Allegheny County, PA (WPRDC CKAN datastore)
// ---------------------------------------------------------------------------
async function allegheny(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, full: boolean) {
  const SRC = "allegheny_me";
  const since = await sinceFor(supabase, SRC, full);
  const RES = "1c59b26a-1684-4bfb-92f7-205b947530cf";
  const geo = countyGeo(cc, "PA", "Allegheny");
  const out: DeathRow[] = [];
  let fetched = 0, skipped = 0;
  for (let offset = 0; offset < 100_000; offset += 5000) {
    const qs = new URLSearchParams({
      resource_id: RES, limit: "5000", offset: String(offset),
      filters: "{}",
      sort: "death_date_and_time asc",
    });
    // CKAN's datastore_search_sql is often disabled; filter client-side on the window instead.
    const data = await fetchJson<{ success: boolean; result: { records: Row[] } }>(`https://data.wprdc.org/api/3/action/datastore_search?${qs}`);
    if (!data.success) throw new Error("WPRDC datastore_search failed");
    const recs = data.result.records ?? [];
    fetched += recs.length;
    for (const r of recs) {
      const date = isoDay(r.death_date_and_time);
      if (!date || date < since) { skipped++; continue; }
      const drugs: string[] = [];
      for (let i = 1; i <= 10; i++) { const d = str(r[`combined_od${i}`]); if (d) drugs.push(d); }
      const cause = drugs.join("; ");
      if (!cause) { skipped++; continue; }
      out.push(build(SRC, String(r._id), date, r.manner_of_death, cause,
        { county: "Allegheny", state: "PA", zip: r.incident_zip }, geo, r));
    }
    if (recs.length < 5000) break;
  }
  const upserted = await upsertChunked(supabase, "external_deaths", out as unknown as Row[], "source_id,source_record_id");
  return { fetched, upserted, skipped, note: `since ${since}` };
}

// ---------------------------------------------------------------------------
// Sacramento County, CA (ArcGIS; fentanyl-related only; last five years)
// ---------------------------------------------------------------------------
async function sacramento(supabase: ReturnType<typeof serviceClient>, cc: CountyCentroids, _full: boolean) {
  const SRC = "sacramento_coroner";
  const feats = await arcgisAll<Row>(
    "https://services1.arcgis.com/5NARefyPVtAeuJPU/arcgis/rest/services/Drug_Deaths/FeatureServer/0",
    "1=1", { outFields: "OBJECTID,CaseNum,DeathDate,DeathYear,Incident_Zip,CAUSE,FentanylCause,Drug_Summary", geometry: false, orderBy: "OBJECTID" },
  );
  const geo = countyGeo(cc, "CA", "Sacramento");
  const out: DeathRow[] = [];
  let skipped = 0;
  for (const f of feats) {
    const r = f.attributes;
    const cause = [r.CAUSE, r.Drug_Summary].filter((s) => typeof s === "string" && s).join("; ");
    const id = str(r.CaseNum) ? await sha(String(r.CaseNum)) : String(r.OBJECTID);
    let date = isoDayFromEpochMs(r.DeathDate);
    let precision: DeathRow["date_precision"] = "day";
    if (!date && r.DeathYear) { date = `${r.DeathYear}-01-01`; precision = "year"; }
    if (!cause && !date) { skipped++; continue; }
    out.push(build(SRC, id, date, "accident", cause || "Fentanyl-related drug death",
      { county: "Sacramento", state: "CA", zip: r.Incident_Zip }, geo, r,
      { fentanyl: true, any_opioid: true }, precision));
  }
  const upserted = await upsertChunked(supabase, "external_deaths", out as unknown as Row[], "source_id,source_record_id");
  return { fetched: feats.length, upserted, skipped, note: "full layer (last five years)" };
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
      { id: "cook_county_me", run: () => cook(supabase, cc, full) },
      { id: "santa_clara_me", run: () => santaClara(supabase, cc, full) },
      { id: "san_diego_me", run: () => sanDiego(supabase, cc, full) },
      { id: "allegheny_me", run: () => allegheny(supabase, cc, full) },
      { id: "sacramento_coroner", run: () => sacramento(supabase, cc, full) },
      { id: "connecticut_ocme", run: () => connecticut(supabase, cc, full) },
    ], supabase, only);
    return jsonResponse({ ok: results.every((r) => r.ok), ms: Date.now() - started, results });
  } catch (e) {
    console.error("sync-me-deaths:", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
