// Nightly sync of UNC Street Drug Analysis Lab open data (analysis_dataset.csv)
// into external_reports. One normalizer, defensive against upstream shape drift.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_ID = "unc_drugchecking";
const SHAPE_VERSION = 2;
const CHUNK = 500;
const FETCH_TIMEOUT = 30_000;

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
  raw: Record<string, string>;
  shape_version: number;
};

const FLAG_COLUMNS = [
  "lab_fentanyl", "lab_fentanyl_any", "lab_xylazine", "lab_xylazine_any",
  "lab_meth", "lab_meth_any", "lab_cocaine", "lab_cocaine_any",
  "lab_nitazenes_any", "lab_carfentanil_any", "lab_opiates_opioids_any",
];

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

function num(v: string | undefined): number | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function isoDate(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  const d = new Date(t);
  if (isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 2015 || y > 2100) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeRow(get: (col: string) => string | undefined, rawObj: Record<string, string>): Norm | null {
  const sampleid = text(get("sampleid"));
  if (!sampleid) return null;
  const state = text(get("state"));
  if (!state || state.length !== 2) return null;

  const flags: Record<string, boolean | null> = {};
  for (const c of FLAG_COLUMNS) flags[c] = flag(get(c));

  const detected = (text(get("primary")) ?? "")
    .split(/[;,]/).map((s) => s.trim()).filter(Boolean);

  const lat = num(get("lat"));
  const lon = num(get("lon"));

  return {
    source_id: SOURCE_ID,
    source_record_id: sampleid,
    substance_expected: text(get("expectedsubstance")),
    substances_detected: detected,
    lab_flags: flags,
    sample_type: text(get("sampletype")),
    is_pill: flag(get("pill")) === true,
    county: text(get("county")),
    state: state.toUpperCase(),
    lat, lon,
    geo_precision: lat !== null && lon !== null ? "county" : "state",
    collected_on: isoDate(get("date_collect")),
    completed_on: isoDate(get("date_complete")),
    raw: rawObj,
    shape_version: SHAPE_VERSION,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: source, error: srcErr } = await supabase
      .from("external_sources").select("data_url, enabled").eq("id", SOURCE_ID).single();
    if (srcErr || !source) throw new Error(`source row missing: ${srcErr?.message}`);
    if (!source.enabled) {
      return new Response(JSON.stringify({ skipped: "source disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
    const res = await fetch(source.data_url, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`upstream fetch failed: ${res.status}`);
    const csv = await res.text();

    const rows = parseCsv(csv);
    if (rows.length < 2) throw new Error("upstream CSV empty or unparseable");
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = new Map(header.map((h, i) => [h, i]));

    let upserted = 0, skipped = 0;
    let batch: Norm[] = [];
    const flush = async () => {
      if (!batch.length) return;
      const { error } = await supabase
        .from("external_reports")
        .upsert(batch, { onConflict: "source_id,source_record_id" });
      if (error) throw new Error(`upsert failed: ${error.message}`);
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
      const norm = normalizeRow(get, rawObj);
      if (!norm) { skipped++; continue; }
      batch.push(norm);
      if (batch.length >= CHUNK) await flush();
    }
    await flush();

    await supabase.from("external_sources")
      .update({ last_synced_at: new Date().toISOString() }).eq("id", SOURCE_ID);

    return new Response(JSON.stringify({ ok: true, upserted, skipped, total: rows.length - 1 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-unc-drugchecking:", e);
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
