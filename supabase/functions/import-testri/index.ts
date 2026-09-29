// One-shot (re-runnable) import of the testRI study results table published by
// Prevent Overdose RI (https://preventoverdoseri.org/test-ri/). testRI tested
// 203 community samples across Rhode Island in 2022-2024 at the Rhode Island
// Hospital toxicology lab; the study has concluded, so there is no schedule -
// re-run manually if the page changes. Same normalized shape as the UNC feed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_ID = "testri_ri";
const PAGE = "https://preventoverdoseri.org/test-ri/";
const SHAPE_VERSION = 1;
const FETCH_TIMEOUT = 45_000;

// Rhode Island municipality -> county FIPS (all 39 towns + common variants).
const RI_COUNTY: Record<string, string> = {
  barrington: "44001", bristol: "44001", warren: "44001",
  coventry: "44003", "east greenwich": "44003", warwick: "44003", "west greenwich": "44003", "west warwick": "44003",
  jamestown: "44005", "little compton": "44005", middletown: "44005", newport: "44005", portsmouth: "44005", tiverton: "44005",
  burrillville: "44007", "central falls": "44007", cranston: "44007", cumberland: "44007", "east providence": "44007",
  foster: "44007", glocester: "44007", johnston: "44007", lincoln: "44007", "north providence": "44007",
  "north smithfield": "44007", pawtucket: "44007", providence: "44007", scituate: "44007", smithfield: "44007",
  woonsocket: "44007", rumford: "44007", riverside: "44007",
  charlestown: "44009", exeter: "44009", hopkinton: "44009", narragansett: "44009", "new shoreham": "44009",
  "block island": "44009", "north kingstown": "44009", richmond: "44009", "south kingstown": "44009", westerly: "44009",
};
const COUNTY_NAME: Record<string, string> = {
  "44001": "Bristol", "44003": "Kent", "44005": "Newport", "44007": "Providence", "44009": "Washington",
};

const PRIORITY = [
  /carfentanil/i, /nitazene/i, /fentanyl/i, /xylazine/i, /medetomidine/i, /btmps|tetramethyl-4-piperidyl/i,
  /bromazolam|clonazolam|flualprazolam|etizolam|benzodiazep|azolam$/i,
  /methamphetamine/i, /cocaine/i, /heroin/i, /mdma/i, /ketamine/i, /tramadol/i, /levamisole/i,
];
function rank(name: string): number {
  const i = PRIORITY.findIndex((re) => re.test(name));
  return i < 0 ? PRIORITY.length : i;
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}

// Clean one substance token: drop majority stars, class codes "(O)" and
// abundance notes, normalise a few spellings.
function cleanName(t: string): string | null {
  let s = decode(t)
    .replace(/\*/g, "")
    .replace(/\((?:O|S|A|M|H|B|C|CBN|DMT|[A-Z]\/[A-Z])\)/g, "")
    .replace(/\b[OSAMHBC]\)/g, "")
    .replace(/\((?:major|minor|trace)\)/gi, "")
    .replace(/\s+/g, " ").trim().replace(/[,;:]+$/, "").trim();
  if (!s) return null;
  if (/^parafluorofentanyl$/i.test(s)) s = "Para-fluorofentanyl";
  return s;
}

type Found = { primary: string[]; trace: string[]; major: string[] };

// "Substances found" cell -> primary detections, trace/byproducts, majors.
function parseFound(html: string): Found {
  const out: Found = { primary: [], trace: [], major: [] };
  let mode: "primary" | "trace" = "primary";
  const push = (list: string[], name: string) => { if (!list.includes(name)) list.push(name); };
  for (const rawLine of html.split(/<br\s*\/?>/i)) {
    const isBold = /<b>|<strong>/i.test(rawLine);
    const line = decode(rawLine);
    if (!line) continue;
    const header = line.match(/^((?:Starting material|Breakdown products|Byproducts|Substances (?:found )?in)[^:]*):\s*(.*)$/i);
    if (header) {
      mode = /^Substances/i.test(header[1]) ? "primary" : "trace";
      const rest = header[2];
      if (rest) for (const tok of rest.split(/[,;]/)) { const n = cleanName(tok); if (n) push(out.trace, n); }
      continue;
    }
    const isMetabolite = /\(M\)/.test(line);
    if (mode === "trace" || isMetabolite) {
      for (const tok of line.split(/[,;]/)) { const n = cleanName(tok); if (n) push(out.trace, n); }
      continue;
    }
    const n = cleanName(line);
    if (!n) continue;
    push(out.primary, n);
    if (isBold || /\*/.test(line)) push(out.major, n);
  }
  const order = (a: string, b: string) =>
    (rank(a) - rank(b)) || ((out.major.includes(a) ? 0 : 1) - (out.major.includes(b) ? 0 : 1));
  out.primary.sort(order);
  out.trace = out.trace.filter((n) => !out.primary.includes(n)).sort((a, b) => rank(a) - rank(b));
  return out;
}

function flagsFor(primary: string[]): Record<string, boolean> {
  const any = (re: RegExp) => primary.some((n) => re.test(n));
  return {
    lab_fentanyl: primary.some((n) => /^fentanyl$/i.test(n)),
    lab_fentanyl_any: any(/fentanyl/i),
    lab_xylazine: any(/^xylazine$/i), lab_xylazine_any: any(/xylazine/i),
    lab_nitazene: any(/nitazene/i), lab_nitazene_any: any(/nitazene/i),
    lab_carfentanil: any(/^carfentanil$/i), lab_carfentanil_any: any(/carfentanil/i),
    lab_medetomidine_any: any(/medetomidine/i),
    lab_meth: any(/^methamphetamine$/i), lab_meth_any: any(/methamphetamine/i),
    lab_cocaine: any(/^cocaine$/i), lab_cocaine_any: any(/cocaine/i),
    lab_heroin_any: any(/^heroin$/i),
    lab_benzodiazepine_any: any(/azolam|azepam|azepine/i),
    lab_ketamine_any: any(/ketamine/i),
    lab_opioid_any: any(/fentanyl|nitazene|heroin|morphine|methadone|tramadol|codeine|oxycodone|hydrocodone|buprenorphine|carfentanil/i),
  };
}

function cityToCounty(raw: string): { county: string | null; fips: string | null; city: string | null } {
  let c = decode(raw).toLowerCase();
  if (c.includes("/")) c = c.split("/").pop()!.trim(); // "Internet purchase / Providence"
  c = c.replace(/providencee/, "providence").trim();
  const fips = RI_COUNTY[c] ?? null;
  return { county: fips ? COUNTY_NAME[fips] : null, fips, city: c ? c.replace(/\b\w/g, (m) => m.toUpperCase()) : null };
}

async function getHtml(url: string): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; StampedHarmReduction/1.0)" } });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: cents, error: cErr } = await supabase
      .from("county_centroids").select("fips, lat, lon").like("fips", "44%");
    if (cErr) throw new Error(`centroids: ${cErr.message}`);
    const centroid = new Map<string, [number, number]>((cents ?? []).map((c: { fips: string; lat: number; lon: number }) => [c.fips, [c.lat, c.lon]]));

    const html = await getHtml(PAGE);
    const trRe = /<tr id="table_\d+_row_\d+"[^>]*>([\s\S]*?)<\/tr>/g;
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const rows: Record<string, unknown>[] = [];
    let m: RegExpExecArray | null;
    while ((m = trRe.exec(html))) {
      const tds: string[] = [];
      let t: RegExpExecArray | null;
      tdRe.lastIndex = 0;
      while ((t = tdRe.exec(m[1]))) tds.push(t[1]);
      if (tds.length < 6) continue;
      const [num, month, city, tested, soldAs, foundHtml] = tds;
      const sample = decode(num);
      if (!/^\d+$/.test(sample)) continue;
      const ym = decode(month).match(/^(\d{4})-(\d{2})$/);
      const found = parseFound(foundHtml);
      const geo = cityToCounty(city);
      const cent = geo.fips ? centroid.get(geo.fips) : undefined;
      const testedTxt = decode(tested);
      const soldTxt = decode(soldAs).replace(/^u(?:n)?known$/i, "Unknown");
      rows.push({
        source_id: SOURCE_ID,
        source_record_id: `testri:${sample}`,
        substance_expected: soldTxt || null,
        substances_detected: found.primary,
        substances_trace: found.trace,
        lab_flags: flagsFor(found.primary),
        sample_type: testedTxt || null,
        is_pill: /\bpill|tablet|capsule\b/i.test(testedTxt),
        county: geo.county,
        state: "RI",
        lat: cent ? cent[0] : null,
        lon: cent ? cent[1] : null,
        geo_precision: cent ? "county" : "state",
        collected_on: ym ? `${ym[1]}-${ym[2]}-01` : null, // month precision
        completed_on: null,
        image_url: null,
        raw: { sample, month: decode(month), city: decode(city), tested: testedTxt, sold_as: decode(soldAs), found_html: foundHtml, major: found.major },
        shape_version: SHAPE_VERSION,
      });
    }
    if (rows.length === 0) throw new Error("no rows parsed — page structure may have changed");

    const { error } = await supabase
      .from("external_reports").upsert(rows, { onConflict: "source_id,source_record_id" });
    if (error) throw new Error(`upsert failed: ${error.message}`);

    await supabase.from("external_sources")
      .update({ last_synced_at: new Date().toISOString() }).eq("id", SOURCE_ID);

    return new Response(JSON.stringify({
      ok: true, upserted: rows.length,
      mapped: rows.filter((r) => r.lat !== null).length,
      sample: rows[0],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("import-testri:", e);
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
