// Nightly sync of UNC Street Drug Analysis Lab open data (MIT-licensed GitHub
// datasets) into external_reports. v3: ingests ALL program datasets (~10.5k
// samples, 15+ states), not the 20-row example file. One normalizer, defensive
// against upstream shape drift; dates are hostile; raw rows kept.
// Community standards honored: attribution in-app, harm-reduction use only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_ID = "unc_drugchecking";
const SHAPE_VERSION = 3;
const CHUNK = 500;
const FETCH_TIMEOUT = 60_000;

const REPO = "https://raw.githubusercontent.com/opioiddatalab/drugchecking/main/datasets";
// program key -> CSV path. Keys prefix source_record_id so ids never collide
// across programs.
const DATASETS: Record<string, string> = {
  nc: `${REPO}/nc/nc_analysis_dataset.csv`,
  wa: `${REPO}/selfservice/WA/analysis_dataset.csv`,
  nys: `${REPO}/selfservice/nys/analysis_dataset.csv`,
  or: `${REPO}/selfservice/OR/analysis_dataset.csv`,
  nm: `${REPO}/selfservice/NM/analysis_dataset.csv`,
  tn: `${REPO}/selfservice/TN/analysis_dataset.csv`,
  nv: `${REPO}/selfservice/NV/analysis_dataset.csv`,
  ac: `${REPO}/selfservice/AC/analysis_dataset.csv`,
  hc: `${REPO}/selfservice/HC/analysis_dataset.csv`,
  rf: `${REPO}/selfservice/RF/analysis_dataset.csv`,
  rt: `${REPO}/selfservice/RT/analysis_dataset.csv`,
  rv: `${REPO}/selfservice/RV/analysis_dataset.csv`,
  hnc: `${REPO}/selfservice/hnc/analysis_dataset.csv`,
};

// Population-weighted county centroids derived from US Census data.
const CENTROIDS_URL = "https://raw.githubusercontent.com/btskinner/spatial/master/data/county_centers.csv";

// ---------- CSV parsing (quotes, embedded commas/newlines) ----------
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

type Norm = {
  source_id: string;
  source_record_id: string;
  substance_expected: string | null;
  substances_detected: string[];
  lab_flags: Record<string, boolean | null>;
  sample_type: string | null;
  is_pill: boolean;
  county: string | null;
  state: string | null;
  lat: number | null;
  lon: number | null;
  geo_precision: string;
  collected_on: string | null;
  completed_on: string | null;
  image_url: string | null;
  raw: Record<string, string>;
  shape_version: number;
};

const PRIMARY_FLAG_NAMES: Record<string, string> = {
  lab_fentanyl: "fentanyl", lab_meth: "methamphetamine", lab_cocaine: "cocaine",
  lab_mdma: "MDMA", lab_xylazine: "xylazine", lab_tramadol: "tramadol",
  lab_caffeine: "caffeine", lab_gabapentin: "gabapentin", lab_ketamine: "ketamine",
  lab_nitazene: "nitazenes", lab_carfentanil: "carfentanil",
  lab_benzodiazepine: "benzodiazepine", lab_potent_benzodiazepine: "potent benzodiazepine",
  lab_opioid: "opioid", lab_btmps: "BTMPS", lab_synthetic_cannabinoid: "synthetic cannabinoid",
};

function flag(v: string | undefined): boolean | null {
  if (v === undefined) return null;
  const t = v.trim().toLowerCase();
  if (t === "1" || t === "true" || t === "yes") return true;
  if (t === "0" || t === "false" || t === "no") return false;
  return null;
}

function text(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t && t.toLowerCase() !== "na" ? t : null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function isoDate(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  // Stata-style "09dec2022"
  const m = t.toLowerCase().match(/^(\d{1,2})([a-z]{3})(\d{4})$/);
  if (m && MONTHS[m[2]]) {
    const y = Number(m[3]);
    if (y < 2015 || y > 2100) return null;
    return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 2015 || y > 2100) return null;
  return d.toISOString().slice(0, 10);
}

function fips5(v: string | undefined): string | null {
  const t = (v ?? "").trim().replace(/\.0$/, "");
  if (!t || !/^\d{1,5}$/.test(t)) return null;
  return t.padStart(5, "0");
}

function normalizeRow(
  program: string,
  header: string[],
  get: (col: string) => string | undefined,
  rawObj: Record<string, string>,
  centroids: Map<string, [number, number]>,
): Norm | null {
  const sampleid = text(get("sampleid"));
  if (!sampleid) return null;
  const state = text(get("state"));
  if (!state || state.length !== 2) return null; // drops "International" etc.

  const flags: Record<string, boolean | null> = {};
  for (const h of header) {
    if (h.startsWith("lab_") && !h.startsWith("lab_num_")) flags[h] = flag(get(h));
  }

  const detected = Object.entries(PRIMARY_FLAG_NAMES)
    .filter(([col]) => flags[col] === true)
    .map(([, name]) => name);

  const fips = fips5(get("countyfips"));
  const cent = fips ? centroids.get(fips) : undefined;

  return {
    source_id: SOURCE_ID,
    source_record_id: `${program}:${sampleid}`,
    substance_expected: text(get("expectedsubstance")),
    substances_detected: detected,
    lab_flags: flags,
    sample_type: text(get("sampletype")),
    is_pill: flag(get("pill")) === true,
    county: text(get("county")),
    state: state.toUpperCase(),
    lat: cent ? cent[0] : null,
    lon: cent ? cent[1] : null,
    geo_precision: cent ? "county" : "state",
    collected_on: isoDate(get("date_collect")),
    completed_on: isoDate(get("date_complete")),
    image_url: null, // UNC publishes chromatograms, not substance photos
    raw: rawObj,
    shape_version: SHAPE_VERSION,
  };
}

async function fetchText(url: string): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// deno-lint-ignore no-explicit-any
async function ensureCentroids(supabase: any): Promise<Map<string, [number, number]>> {
  const map = new Map<string, [number, number]>();
  const { count } = await supabase
    .from("county_centroids").select("fips", { count: "exact", head: true });
  if (!count || count < 3000) {
    const csv = await fetchText(CENTROIDS_URL);
    const rows = parseCsv(csv);
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const iFips = header.indexOf("fips");
    // population-weighted 2010 centroid; fall back to geographic
    const iLat = header.indexOf("pclat10") >= 0 ? header.indexOf("pclat10") : header.indexOf("clat10");
    const iLon = header.indexOf("pclon10") >= 0 ? header.indexOf("pclon10") : header.indexOf("clon10");
    if (iFips < 0 || iLat < 0 || iLon < 0) throw new Error("centroid CSV shape changed");
    let batch: { fips: string; lat: number; lon: number }[] = [];
    for (let r = 1; r < rows.length; r++) {
      const fips = fips5(rows[r][iFips]);
      const lat = Number(rows[r][iLat]);
      const lon = Number(rows[r][iLon]);
      if (!fips || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      batch.push({ fips, lat, lon });
      if (batch.length >= 1000) {
        const { error } = await supabase.from("county_centroids").upsert(batch);
        if (error) throw new Error(`centroid upsert failed: ${error.message}`);
        batch = [];
      }
    }
    if (batch.length) {
      const { error } = await supabase.from("county_centroids").upsert(batch);
      if (error) throw new Error(`centroid upsert failed: ${error.message}`);
    }
  }
  // read back full table (paged; PostgREST caps rows per request)
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("county_centroids").select("fips, lat, lon").range(from, from + 999);
    if (error) throw new Error(`centroid read failed: ${error.message}`);
    for (const r of data ?? []) map.set(r.fips, [r.lat, r.lon]);
    if (!data || data.length < 1000) break;
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: source, error: srcErr } = await supabase
      .from("external_sources").select("enabled").eq("id", SOURCE_ID).single();
    if (srcErr || !source) throw new Error(`source row missing: ${srcErr?.message}`);
    if (!source.enabled) {
      return new Response(JSON.stringify({ skipped: "source disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const centroids = await ensureCentroids(supabase);

    // one-time cleanup: rows from the 20-row example file used bare sampleids
    await supabase.from("external_reports")
      .delete().eq("source_id", SOURCE_ID).not("source_record_id", "like", "%:%");

    let upserted = 0, skipped = 0;
    const perProgram: Record<string, number> = {};

    for (const [program, url] of Object.entries(DATASETS)) {
      let csv: string;
      try {
        csv = await fetchText(url);
      } catch (e) {
        console.error(`dataset ${program} fetch failed:`, e);
        perProgram[program] = -1; // marked failed, others continue
        continue;
      }
      const rows = parseCsv(csv);
      if (rows.length < 2) { perProgram[program] = 0; continue; }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = new Map(header.map((h, i) => [h, i]));
      let batch: Norm[] = [];
      let count = 0;
      const flush = async () => {
        if (!batch.length) return;
        const { error } = await supabase
          .from("external_reports")
          .upsert(batch, { onConflict: "source_id,source_record_id" });
        if (error) throw new Error(`upsert failed (${program}): ${error.message}`);
        upserted += batch.length;
        batch = [];
      };
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r];
        const get = (col: string) => {
          const i = idx.get(col);
          return i === undefined ? undefined : cells[i];
        };
        const rawObj: Record<string, string> = {};
        header.forEach((h, i) => { if (cells[i] !== undefined && cells[i] !== "") rawObj[h] = cells[i]; });
        const norm = normalizeRow(program, header, get, rawObj, centroids);
        if (!norm) { skipped++; continue; }
        batch.push(norm);
        count++;
        if (batch.length >= CHUNK) await flush();
      }
      await flush();
      perProgram[program] = count;
    }

    await supabase.from("external_sources")
      .update({ last_synced_at: new Date().toISOString() }).eq("id", SOURCE_ID);

    return new Response(JSON.stringify({ ok: true, upserted, skipped, perProgram }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-unc-drugchecking:", e);
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
