// Weekly sync of CDC/NCHS provisional county-level drug overdose deaths
// (data.cdc.gov dataset gb4e-yj24) into overdose_county_periods.
// Fetches the latest 12-month-ending period plus the same period one year
// earlier (for trend). Suppressed counts (1-9) arrive as null and stay null.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_ID = "cdc_vsrr_county";
const API = "https://data.cdc.gov/resource/gb4e-yj24.json";
const FETCH_TIMEOUT = 60_000;

type Row = {
  fips?: string; st_abbrev?: string; countyname?: string;
  provisional_drug_overdose?: string | number | null;
  percentage_of_records_pending?: string | number | null;
  footnote?: string | null; monthendingdate?: string; data_as_of?: string;
};

async function getJson(url: string): Promise<unknown> {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. latest period available
    const latestRes = await getJson(`${API}?$select=max(monthendingdate)%20AS%20m`) as { m?: string }[];
    const latestIso = latestRes?.[0]?.m;
    if (!latestIso) throw new Error("could not determine latest period");
    const latest = new Date(latestIso);
    const prior = new Date(latest); prior.setUTCFullYear(prior.getUTCFullYear() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 19) + ".000"; // Socrata floating timestamp

    // 2. rows for both periods (dataset has ~3.1k counties per period)
    const where = encodeURIComponent(`monthendingdate in ('${fmt(latest)}','${fmt(prior)}')`);
    const select = encodeURIComponent("fips,st_abbrev,countyname,provisional_drug_overdose,percentage_of_records_pending,footnote,monthendingdate,data_as_of");
    const rows = await getJson(`${API}?$select=${select}&$where=${where}&$limit=20000`) as Row[];
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("no rows returned");

    const out: Record<string, unknown>[] = [];
    let skipped = 0;
    for (const r of rows) {
      const fips = fips5(r.fips);
      const period_end = isoDay(r.monthendingdate);
      if (!fips || !period_end) { skipped++; continue; }
      out.push({
        fips,
        period_end,
        state: typeof r.st_abbrev === "string" ? r.st_abbrev.toUpperCase() : null,
        county: typeof r.countyname === "string" ? r.countyname : null,
        deaths: num(r.provisional_drug_overdose),
        pct_pending: num(r.percentage_of_records_pending),
        footnote: typeof r.footnote === "string" && r.footnote ? r.footnote : null,
        data_as_of: isoDay(r.data_as_of),
      });
    }

    let upserted = 0;
    for (let i = 0; i < out.length; i += 1000) {
      const batch = out.slice(i, i + 1000);
      const { error } = await supabase
        .from("overdose_county_periods")
        .upsert(batch, { onConflict: "fips,period_end" });
      if (error) throw new Error(`upsert failed: ${error.message}`);
      upserted += batch.length;
    }

    await supabase.from("external_sources")
      .update({ last_synced_at: new Date().toISOString() }).eq("id", SOURCE_ID);

    return new Response(JSON.stringify({
      ok: true, upserted, skipped,
      latest_period: latest.toISOString().slice(0, 10),
      prior_period: prior.toISOString().slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-cdc-overdose:", e);
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
