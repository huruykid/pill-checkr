// Weekly sync of CDC/NCHS provisional county-level drug overdose deaths
// (data.cdc.gov dataset gb4e-yj24) into overdose_county_periods.
// Fetches the latest 12-month-ending period plus the same period one year
// earlier (for trend). Suppressed counts (1-9) arrive without a value and are
// stored as NULL deaths + the CDC footnote. One row per county per period.
//
// Dataset facts (verified 2026-09): fips is unpadded ("6037"), ~3,144 rows per
// monthendingdate, roughly half of counties suppressed in any given period.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_ID = "cdc_vsrr_county";
const API = "https://data.cdc.gov/resource/gb4e-yj24.json";
const FETCH_TIMEOUT = 60_000;
const PAGE = 5000;

type Row = {
  fips?: string; st_abbrev?: string; countyname?: string;
  provisional_drug_overdose?: string | number | null;
  percentage_of_records_pending?: string | number | null;
  footnote?: string | null; monthendingdate?: string; data_as_of?: string;
};

async function getJson(params: Record<string, string>): Promise<unknown> {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const url = `${API}?${qs}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`CDC fetch failed: ${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isoDay(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function fips5(v: unknown): string | null {
  const t = String(v ?? "").trim();
  if (!/^\d{1,5}$/.test(t)) return null;
  return t.padStart(5, "0");
}

// Socrata floating timestamp literal for a period-end date.
const ts = (d: Date) => d.toISOString().slice(0, 10) + "T00:00:00.000";

async function fetchPeriod(period: Date): Promise<Row[]> {
  const all: Row[] = [];
  for (let offset = 0; offset < 50_000; offset += PAGE) {
    const page = await getJson({
      "$select": "fips,st_abbrev,countyname,provisional_drug_overdose,percentage_of_records_pending,footnote,monthendingdate,data_as_of",
      "$where": `monthendingdate='${ts(period)}'`,
      "$order": "fips",
      "$limit": String(PAGE),
      "$offset": String(offset),
    }) as Row[];
    if (!Array.isArray(page)) throw new Error("unexpected CDC payload");
    all.push(...page);
    if (page.length < PAGE) break;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. latest period available
    const latestRes = await getJson({ "$select": "max(monthendingdate) AS m" }) as { m?: string }[];
    const latestIso = latestRes?.[0]?.m;
    if (!latestIso) throw new Error("could not determine latest period");
    const latest = new Date(latestIso);
    const prior = new Date(latest); prior.setUTCFullYear(prior.getUTCFullYear() - 1);

    // 2. one row per county per period, fetched per period with paging
    const rows = [...await fetchPeriod(latest), ...await fetchPeriod(prior)];
    if (rows.length === 0) throw new Error("no rows returned");

    // Dedupe on the primary key so a single upsert never touches a row twice.
    const byKey = new Map<string, Record<string, unknown>>();
    let skipped = 0;
    for (const r of rows) {
      const fips = fips5(r.fips);
      const period_end = isoDay(r.monthendingdate);
      if (!fips || !period_end) { skipped++; continue; }
      byKey.set(`${fips}|${period_end}`, {
        fips,
        period_end,
        state: typeof r.st_abbrev === "string" ? r.st_abbrev.toUpperCase() : null,
        county: typeof r.countyname === "string" ? r.countyname : null,
        deaths: num(r.provisional_drug_overdose),
        pct_pending: num(r.percentage_of_records_pending),
        footnote: typeof r.footnote === "string" && r.footnote ? r.footnote : null,
        data_as_of: isoDay(r.data_as_of),
        synced_at: new Date().toISOString(),
      });
    }
    const out = [...byKey.values()];

    let upserted = 0;
    for (let i = 0; i < out.length; i += 1000) {
      const batch = out.slice(i, i + 1000);
      const { error } = await supabase
        .from("overdose_county_periods")
        .upsert(batch, { onConflict: "fips,period_end" });
      if (error) throw new Error(`upsert failed: ${error.message}`);
      upserted += batch.length;
    }

    // Drop periods older than the prior-year comparison so the table stays small
    // and overdose_county_latest always compares the two most relevant periods.
    await supabase.from("overdose_county_periods")
      .delete().lt("period_end", prior.toISOString().slice(0, 10));

    await supabase.from("external_sources")
      .update({ last_synced_at: new Date().toISOString() }).eq("id", SOURCE_ID);

    return new Response(JSON.stringify({
      ok: true, fetched: rows.length, upserted, skipped,
      latest_period: latest.toISOString().slice(0, 10),
      prior_period: prior.toISOString().slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-cdc-overdose:", e);
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
