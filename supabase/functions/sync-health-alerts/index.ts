// Daily sync of state and local health-department drug-supply alerts into
// external_alerts (alongside the national CFSRE NPS Discovery feed).
//
//   philly_pdph_han      hip.phila.gov health alerts table            PA / Philadelphia
//   nyc_dohmh_han        NYC HAN archive (year-level dates)           NY / New York City
//   wa_doh_han           WA DOH HAN table, which relays CDC HAN too   WA + US
//   baltimore_bchd_news  Baltimore City Health Department news        MD / Baltimore
//
// Why these and not cdc.gov / dea.gov / health.ny.gov directly: those hosts
// return 403 to requests from cloud runtimes (verified from this project's
// database via pg_net), so the WA DOH listing is our reachable mirror of CDC
// HAN notices. Only alerts about the drug supply are kept (DRUG_ALERT_RE).
// Body options: {"only":["philly_pdph_han"]}
import {
  serviceClient, fetchText, upsertChunked, runSources, jsonResponse, readOptions, corsHeaders,
} from "../_shared/sync.ts";
import {
  parsePhillyHip, parseNycHan, parseWaDohHan, parseBaltimoreNews, type ParsedAlert,
} from "../_shared/alertParsers.ts";

const SHAPE_VERSION = 1;

// WA DOH lists 10 notices per page, newest first; six pages ≈ a year or more.
const WA_PAGES = Array.from({ length: 6 }, (_, i) =>
  `https://doh.wa.gov/public-health-provider-resources/washington-health-alert-network?page=${i}`);

type Row = Record<string, unknown>;

function toRows(sourceId: string, alerts: ParsedAlert[]): Row[] {
  const seen = new Set<string>();
  const rows: Row[] = [];
  for (const a of alerts) {
    if (seen.has(a.source_record_id)) continue;
    seen.add(a.source_record_id);
    rows.push({
      source_id: sourceId, source_record_id: a.source_record_id, title: a.title.slice(0, 400),
      published_on: a.published_on, date_precision: a.date_precision, url: a.url, pdf_url: a.pdf_url, image_url: null,
      summary: a.summary, substances: a.substances, severity: a.severity, region: a.region,
      locality: a.locality, issuer: a.issuer, raw: a.raw, shape_version: SHAPE_VERSION, synced_at: new Date().toISOString(),
    });
  }
  return rows;
}

// `urls`: one listing page, or several (paginated archives). Each page is
// parsed independently; a page that fails to load does not lose the others.
async function scrape(
  supabase: ReturnType<typeof serviceClient>, sourceId: string, urls: string | string[], parse: (html: string) => ParsedAlert[],
) {
  const parsed: ParsedAlert[] = [];
  let pages = 0, bytes = 0;
  for (const url of Array.isArray(urls) ? urls : [urls]) {
    try {
      const html = await fetchText(url, { headers: { Accept: "text/html,application/xhtml+xml" } });
      bytes += html.length; pages++;
      parsed.push(...parse(html));
    } catch (e) {
      if (pages === 0) throw e;          // first page must load; later pages are best-effort
      console.warn(`${sourceId}: ${url}: ${e}`);
    }
  }
  if (parsed.length === 0 && bytes < 5000) throw new Error(`suspiciously small listing (${bytes} bytes) for ${sourceId}`);
  const rows = toRows(sourceId, parsed);
  const upserted = await upsertChunked(supabase, "external_alerts", rows, "source_id,source_record_id");
  return { fetched: parsed.length, upserted, note: parsed.length === 0 ? "parser matched nothing — check the page layout" : undefined };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const supabase = serviceClient();
    const { only } = await readOptions(req);
    const results = await runSources([
      { id: "philly_pdph_han", run: () => scrape(supabase, "philly_pdph_han", "https://hip.phila.gov/health-alerts/", parsePhillyHip) },
      { id: "nyc_dohmh_han", run: () => scrape(supabase, "nyc_dohmh_han", "https://www.nyc.gov/site/doh/providers/resources/health-alert-network.page", parseNycHan) },
      { id: "wa_doh_han", run: () => scrape(supabase, "wa_doh_han", WA_PAGES, parseWaDohHan) },
      { id: "baltimore_bchd_news", run: () => scrape(supabase, "baltimore_bchd_news", "https://www.baltimorecity.gov/health/news", parseBaltimoreNews) },
    ], supabase, only);
    return jsonResponse({ ok: results.every((r) => r.ok), ms: Date.now() - started, results });
  } catch (e) {
    console.error("sync-health-alerts:", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
