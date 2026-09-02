// Daily sync of CFSRE NPS Discovery public alerts into external_alerts.
// The listing is a Joomla blog (10 per page, ?start=N). Each item carries a
// date, title/link, first-page thumbnail, "Purpose"/"Summary" paragraphs and a
// PDF button. We keep the source's own words and link back to the document.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_ID = "cfsre_nps_discovery";
const ORIGIN = "https://www.cfsre.org";
const LISTING = `${ORIGIN}/nps-discovery/public-alerts`;
const SHAPE_VERSION = 2;
const PAGE_SIZE = 10;
const MAX_PAGES = 12;
const FETCH_TIMEOUT = 30_000;

// Substance vocabulary: [display name, regex over title+summary]. Order = display order.
const SUBSTANCES: [string, RegExp][] = [
  ["Carfentanil", /carfentanil/i],
  ["Fentanyl", /\bfentanyl\b(?!-related)/i],
  ["Fentanyl analogs", /fentanyl[- ]related|methylfentanyl|fluorofentanyl|norfentanyl|tetramethylfentanyl|fentanyl analog/i],
  ["Nitazenes", /nitazene|benzimidazole opioid/i],
  ["Orphines", /orphine|benzimidazol-2-one/i],
  ["Xylazine", /xylazine/i],
  ["Medetomidine", /medetomidine/i],
  ["BTMPS", /\bBTMPS\b|tetramethyl-4-piperid/i],
  ["Synthetic cannabinoids", /synthetic cannabinoid|\bMDMB|\bADB-|\bSGT-/i],
  ["Synthetic cathinones", /cathinone|butylone|pentylone|eutylone|\bPiHP/i],
  ["Novel benzodiazepines", /benzodiazepine|bromazolam|phenazolam|clonazolam|etizolam/i],
  ["7-hydroxymitragynine (kratom)", /7-?hydroxy ?mitragynine|kratom/i],
  ["Dissociatives", /2F-2oxo-PCE|\bPCE\b|dissociative|ketamine/i],
  ["Counterfeit pills", /counterfeit|fake pill|tablet/i],
];
const DANGER = /carfentanil|fentanyl|nitazene|orphine|opioid|xylazine|medetomidine|BTMPS|fatal|overdose|death/i;

type Parsed = {
  slug: string; title: string; date: string | null; url: string;
  pdf_url: string | null; image_url: string | null; summary: string | null; purpose: string | null;
};

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "’").replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“").replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&ndash;|&#8211;/g, "–").replace(/&mdash;|&#8212;/g, "—")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s.trim() + " UTC");
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function abs(u: string | undefined | null): string | null {
  if (!u) return null;
  return u.startsWith("http") ? u : ORIGIN + (u.startsWith("/") ? u : "/" + u);
}

function paragraphAfter(block: string, label: string): string | null {
  const m = block.match(new RegExp(`<strong>\\s*${label}:?\\s*</strong>:?([\\s\\S]*?)</p>`, "i"));
  if (!m) return null;
  const text = decode(m[1]);
  return text || null;
}

// Whole text of the item body (the col-sm-8 column) minus the download button,
// for alerts that do not use the Purpose/Summary labels. Capped at a sentence
// boundary so cards stay readable; the PDF link carries the full document.
function bodyText(block: string): string | null {
  const start = block.indexOf('class="col-sm-8"');
  if (start < 0) return null;
  const open = block.indexOf(">", start) + 1;
  const end = block.indexOf("<!-- /col-sm-x -->", open);
  let inner = block.slice(open, end > 0 ? end : undefined);
  inner = inner.replace(/<a[^>]*class="btn"[^>]*>[\s\S]*?<\/a>/gi, " ");
  inner = inner.replace(/<br\s*\/?>/gi, " ");
  let text = decode(inner).replace(/^Purpose:\s*/i, "");
  if (!text) return null;
  if (text.length > 1400) {
    const cut = text.slice(0, 1400);
    const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    text = (stop > 400 ? cut.slice(0, stop + 1) : cut) + " …";
  }
  return text;
}

function parseListing(html: string): Parsed[] {
  const out: Parsed[] = [];
  const blocks = html.split('itemprop="blogPost"').slice(1);
  for (const b of blocks) {
    const href = b.match(/<a href="([^"]+)" itemprop="url">/)?.[1];
    const titleRaw = b.match(/itemprop="url">\s*([\s\S]*?)<\/a>/)?.[1];
    if (!href || !titleRaw) continue;
    const slug = href.split("/").filter(Boolean).pop() || href;
    out.push({
      slug,
      title: decode(titleRaw),
      date: parseDate(b.match(/<div class='create'>\s*([^<]+)<\/div>/)?.[1]),
      url: abs(href)!,
      pdf_url: abs(b.match(/href="([^"]+\.pdf)"/i)?.[1]),
      image_url: abs(b.match(/src="([^"]+)"[^>]*itemprop="thumbnailUrl"/)?.[1]),
      summary: paragraphAfter(b, "Summary") ?? bodyText(b),
      purpose: paragraphAfter(b, "Purpose"),
    });
  }
  return out;
}

async function getHtml(url: string): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StampedHarmReduction/1.0; +https://stamped.app)", Accept: "text/html" },
    });
    if (!res.ok) throw new Error(`fetch failed: ${res.status} ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const seen = new Map<string, Parsed>();
    let pages = 0;
    for (let start = 0; start < PAGE_SIZE * MAX_PAGES; start += PAGE_SIZE) {
      const html = await getHtml(start === 0 ? LISTING : `${LISTING}?start=${start}`);
      const items = parseListing(html);
      pages++;
      let fresh = 0;
      for (const it of items) if (!seen.has(it.slug)) { seen.set(it.slug, it); fresh++; }
      if (items.length === 0 || fresh === 0) break; // past the last page (Joomla repeats it)
    }
    if (seen.size === 0) throw new Error("no alerts parsed — page structure may have changed");

    const rows = [...seen.values()].map((p) => {
      const text = `${p.title} ${p.summary ?? ""} ${p.purpose ?? ""}`;
      const substances = SUBSTANCES.filter(([, re]) => re.test(text)).map(([name]) => name);
      const region = /global|international/i.test(p.title) ? "Global"
        : /north america/i.test(p.title) ? "North America" : "US";
      return {
        source_id: SOURCE_ID,
        source_record_id: p.slug,
        title: p.title,
        published_on: p.date,
        url: p.url,
        pdf_url: p.pdf_url,
        image_url: p.image_url,
        summary: p.summary ?? p.purpose,
        substances,
        severity: DANGER.test(text) ? "danger" : "warning",
        region,
        raw: p,
        shape_version: SHAPE_VERSION,
        synced_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("external_alerts")
      .upsert(rows, { onConflict: "source_id,source_record_id" });
    if (error) throw new Error(`upsert failed: ${error.message}`);

    await supabase.from("external_sources")
      .update({ last_synced_at: new Date().toISOString() }).eq("id", SOURCE_ID);

    return new Response(JSON.stringify({
      ok: true, pages, upserted: rows.length,
      newest: rows.map((r) => r.published_on).filter(Boolean).sort().pop() ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sync-nps-alerts:", e);
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
