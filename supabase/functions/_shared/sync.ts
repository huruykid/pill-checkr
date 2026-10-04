// Shared plumbing for the external-source sync functions.
// Keep this dependency-light: it is imported by every sync-* function.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";


export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Several state/city sites sit behind WAFs that reject the default Deno UA.
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Stamped-sync/1.0 (+https://pillcheckr.app)";

export const FETCH_TIMEOUT = 45_000;

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "User-Agent": BROWSER_UA, "Accept": "*/*", ...(init.headers || {}) },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const text = await fetchText(url, { ...init, headers: { Accept: "application/json", ...(init.headers || {}) } });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`non-JSON response from ${url}: ${text.slice(0, 120)}`);
  }
}

/** Socrata SODA 2.0 paging helper. */
export async function socrataAll<T = Record<string, unknown>>(
  base: string,
  params: Record<string, string>,
  opts: { page?: number; max?: number } = {},
): Promise<T[]> {
  const page = opts.page ?? 5000;
  const max = opts.max ?? 200_000;
  const out: T[] = [];
  for (let offset = 0; offset < max; offset += page) {
    const qs = new URLSearchParams({ ...params, $limit: String(page), $offset: String(offset) });
    const rows = await fetchJson<T[]>(`${base}?${qs}`);
    if (!Array.isArray(rows)) throw new Error(`unexpected Socrata payload from ${base}`);
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

/** ArcGIS FeatureServer paging helper (returns attribute objects + optional geometry). */
export async function arcgisAll<T = Record<string, unknown>>(
  layerUrl: string,
  where: string,
  opts: { outFields?: string; geometry?: boolean; centroid?: boolean; page?: number; max?: number; orderBy?: string } = {},
): Promise<{ attributes: T; geometry?: { x: number; y: number }; centroid?: { x: number; y: number } }[]> {
  const page = opts.page ?? 2000;
  const max = opts.max ?? 200_000;
  const out: { attributes: T; geometry?: { x: number; y: number }; centroid?: { x: number; y: number } }[] = [];
  // Servers cap each page at their own maxRecordCount (often 1000), so
  // advance by what came back, never by the requested page size.
  for (let offset = 0; offset < max;) {
    const qs = new URLSearchParams({
      where,
      outFields: opts.outFields ?? "*",
      returnGeometry: opts.geometry ? "true" : "false",
      outSR: "4326",
      resultOffset: String(offset),
      resultRecordCount: String(page),
      f: "json",
    });
    if (opts.orderBy) qs.set("orderByFields", opts.orderBy);
    if (opts.centroid) qs.set("returnCentroid", "true");   // polygon layers: centroid in 4326, no ring payload
    const data = await fetchJson<{ features?: typeof out; error?: { message: string }; exceededTransferLimit?: boolean }>(
      `${layerUrl}/query?${qs}`,
    );
    if (data.error) throw new Error(`ArcGIS error from ${layerUrl}: ${data.error.message}`);
    const feats = data.features ?? [];
    out.push(...feats);
    if (feats.length === 0) break;
    if (feats.length < page && !data.exceededTransferLimit) break;
    offset += feats.length;
  }
  return out;
}

export async function upsertChunked(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  chunk = 500,
): Promise<number> {
  // Postgres refuses an upsert that touches the same key twice in one
  // statement; dedupe on the conflict columns first, last write wins.
  const keyCols = onConflict.split(",").map((c) => c.trim());
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) byKey.set(keyCols.map((c) => String(r[c] ?? "")).join("|"), r);
  rows = [...byKey.values()];
  let n = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).upsert(batch, { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    n += batch.length;
  }
  return n;
}

export async function touchSource(supabase: SupabaseClient, sourceId: string): Promise<void> {
  await supabase.from("external_sources").update({ last_synced_at: new Date().toISOString() }).eq("id", sourceId);
}

export async function sourceEnabled(supabase: SupabaseClient, sourceId: string): Promise<boolean> {
  const { data } = await supabase.from("external_sources").select("enabled").eq("id", sourceId).maybeSingle();
  return data?.enabled !== false; // missing row = treat as enabled so a forgotten registry row still syncs
}

/** Latest stored date for a source, so incremental pulls can start from there. */
export async function latestDate(
  supabase: SupabaseClient,
  table: string,
  sourceId: string,
  column: string,
): Promise<string | null> {
  const { data } = await supabase.from(table).select(column).eq("source_id", sourceId)
    .order(column, { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  const v = (data as Record<string, unknown> | null)?.[column];
  return typeof v === "string" ? v.slice(0, 10) : null;
}

export type SourceResult = { source: string; ok: boolean; fetched?: number; upserted?: number; skipped?: number; error?: string; note?: string };

/** Run every source, never letting one failure abort the others. */
export async function runSources(
  jobs: { id: string; run: () => Promise<Omit<SourceResult, "source" | "ok">> }[],
  supabase: SupabaseClient,
  only?: string[] | null,
): Promise<SourceResult[]> {
  const results: SourceResult[] = [];
  for (const job of jobs) {
    if (only && only.length && !only.includes(job.id)) continue;
    if (!(await sourceEnabled(supabase, job.id))) {
      results.push({ source: job.id, ok: true, note: "disabled" });
      continue;
    }
    try {
      const r = await job.run();
      await touchSource(supabase, job.id);
      results.push({ source: job.id, ok: true, ...r });
    } catch (e) {
      console.error(`${job.id}:`, e);
      results.push({ source: job.id, ok: false, error: String(e) });
    }
  }
  return results;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Parse a request body like {"only":["cook_county_me"],"full":true}; tolerate empty bodies. */
export async function readOptions(req: Request): Promise<{ only: string[] | null; full: boolean }> {
  try {
    const b = await req.json();
    return {
      only: Array.isArray(b?.only) ? b.only.filter((s: unknown) => typeof s === "string") : null,
      full: b?.full === true,
    };
  } catch {
    return { only: null, full: false };
  }
}

export * from "./text.ts";
