// Pure HTML -> alert parsers for state/local health alert listings. Kept free
// of I/O so they can be unit-tested against saved fixtures (see
// sync-health-alerts/parsers_test.ts). Each returns the source's own words:
// title as published, date as listed, link to the original document.
import { decodeHtml, isoDay, slugify } from "./text.ts";
import { parseSubstances, ALERT_DANGER_RE, DRUG_ALERT_RE } from "./substances.ts";

export interface ParsedAlert {
  source_record_id: string;
  title: string;
  published_on: string | null;
  date_precision: "day" | "month" | "year";
  url: string | null;      // human-readable page
  pdf_url: string | null;  // the document itself
  summary: string | null;
  substances: string[];
  severity: "danger" | "warning" | "info";
  region: string;          // USPS code or 'US'
  locality: string | null;
  issuer: string | null;
  raw: Record<string, unknown>;
}

function abs(base: string, href: string): string {
  try { return new URL(href, base).toString(); } catch { return href; }
}

function finish(p: Omit<ParsedAlert, "substances" | "severity">): ParsedAlert {
  const text = `${p.title} ${p.summary ?? ""}`;
  const substances = parseSubstances(text);
  const severity: ParsedAlert["severity"] = ALERT_DANGER_RE.test(text) ? "danger" : "warning";
  return { ...p, substances, severity };
}

export function isDrugAlert(title: string, summary?: string | null): boolean {
  return DRUG_ALERT_RE.test(`${title} ${summary ?? ""}`);
}

// ---------------------------------------------------------------------------
// Philadelphia Department of Public Health — Health Information Portal
// <tr data-condition=".."><td class="topic"><a href="/document/6386/x.pdf/">Title</a></td>
// <td class="priority update-hip">Update</td><td class="alert-date">Jun 22, 2026</td></tr>
// ---------------------------------------------------------------------------
export function parsePhillyHip(html: string, base = "https://hip.phila.gov/"): ParsedAlert[] {
  const out: ParsedAlert[] = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const tr = m[1];
    if (!/class="topic"/.test(tr)) continue;
    const a = tr.match(/<td[^>]*class="topic"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const titleOnly = tr.match(/<td[^>]*class="topic"[^>]*>([\s\S]*?)<\/td>/i);
    const title = decodeHtml(a ? a[2] : titleOnly ? titleOnly[1] : "");
    if (!title) continue;
    const href = a ? abs(base, a[1]) : null;
    const kind = decodeHtml((tr.match(/<td[^>]*class="priority[^"]*"[^>]*>([\s\S]*?)<\/td>/i) || [, ""])[1]);
    const date = isoDay(decodeHtml((tr.match(/<td[^>]*class="alert-date"[^>]*>([\s\S]*?)<\/td>/i) || [, ""])[1]));
    if (!isDrugAlert(title)) continue;
    const idMatch = href?.match(/\/document\/(\d+)\//);
    out.push(finish({
      source_record_id: idMatch ? `hip-${idMatch[1]}` : slugify(`${date ?? ""}-${title}`),
      title, published_on: date, date_precision: "day",
      url: "https://hip.phila.gov/health-alerts/", pdf_url: href && /\.pdf/i.test(href) ? href : null,
      summary: kind ? `${kind} from the Philadelphia Department of Public Health.` : null,
      region: "PA", locality: "Philadelphia", issuer: "Philadelphia Department of Public Health",
      raw: { kind, href },
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// NYC DOHMH Health Alert Network archive
// <h2>Alerts, 2026</h2><ul><li><a href="/assets/.../han-alert-26-slug.pdf">Alert #26: Title</a></li>...
// Dates are not listed; the archive is organized by year.
// ---------------------------------------------------------------------------
export function parseNycHan(html: string, base = "https://www.nyc.gov/"): ParsedAlert[] {
  const out: ParsedAlert[] = [];
  const secRe = /<h2[^>]*>\s*(Alerts|Advisories|Updates|Notifications)[^<]*?(\d{4})\s*<\/h2>\s*<ul>([\s\S]*?)<\/ul>/gi;
  let s: RegExpExecArray | null;
  while ((s = secRe.exec(html))) {
    const kind = s[1], year = s[2], body = s[3];
    const liRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let a: RegExpExecArray | null;
    while ((a = liRe.exec(body))) {
      const href = abs(base, a[1]);
      const title = decodeHtml(a[2]);
      if (!title || !isDrugAlert(title)) continue;
      const file = href.split("/").pop()?.replace(/\.pdf$/i, "") ?? slugify(title);
      out.push(finish({
        source_record_id: `nyc-${year}-${slugify(file)}`,
        title, published_on: `${year}-01-01`, date_precision: "year",
        url: "https://www.nyc.gov/site/doh/providers/resources/health-alert-network.page",
        pdf_url: /\.pdf/i.test(href) ? href : null,
        summary: `${kind.replace(/s$/, "")} from the NYC Health Department, ${year}.`,
        region: "NY", locality: "New York City", issuer: "NYC Department of Health and Mental Hygiene",
        raw: { kind, year, href },
      }));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Washington State DOH HAN table (also relays CDC HAN notices)
// <tr><td ...field-date><time datetime="2026-09-15T12:00:00Z">09/15/2026</time></td>
// <td ...field-agency>Centers for Disease Control and Prevention</td>
// <td ...conditional-field><a href="https://www.cdc.gov/...">Title</a></td></tr>
// ---------------------------------------------------------------------------
export function parseWaDohHan(html: string): ParsedAlert[] {
  const out: ParsedAlert[] = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html))) {
    const tr = m[1];
    if (!/field-date/.test(tr) || !/<time/.test(tr)) continue;
    const date = isoDay((tr.match(/<time[^>]*datetime="([^"]+)"/i) || [, ""])[1]);
    const agency = decodeHtml((tr.match(/field-agency"[^>]*>([\s\S]*?)<\/td>/i) || [, ""])[1]);
    const a = tr.match(/conditional-field"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const title = decodeHtml(a ? a[2] : (tr.match(/conditional-field"[^>]*>([\s\S]*?)<\/td>/i) || [, ""])[1]);
    if (!title || !isDrugAlert(title)) continue;
    const href = a ? abs("https://doh.wa.gov/", a[1]) : null;
    const isCdc = /centers for disease control/i.test(agency);
    const hanId = href?.match(/han0*(\d+)\.html/i)?.[1];
    out.push(finish({
      source_record_id: isCdc && hanId ? `cdc-han-${hanId}` : slugify(`${date ?? ""}-${agency}-${title}`),
      title, published_on: date, date_precision: "day",
      url: href, pdf_url: href && /\.pdf/i.test(href) ? href : null,
      summary: isCdc ? "CDC Health Alert Network notice, as listed by the Washington State Department of Health." : `Issued by ${agency || "Washington State Department of Health"}.`,
      region: isCdc ? "US" : "WA", locality: isCdc ? null : "Washington", issuer: agency || "Washington State Department of Health",
      raw: { agency, href },
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Baltimore City Health Department news cards
// <a href="/health/news/slug" class="card___article_link ..." aria-label="Title"> ... <time datetime="2026-06-30T12:00:00Z">
// ---------------------------------------------------------------------------
export function parseBaltimoreNews(html: string, base = "https://www.baltimorecity.gov/"): ParsedAlert[] {
  const out: ParsedAlert[] = [];
  const cardRe = /<a[^>]*href="(\/health\/news\/[^"]+)"[^>]*class="[^"]*card___article_link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html))) {
    const href = abs(base, m[1]);
    const inner = m[2];
    const title = decodeHtml((inner.match(/<h2[^>]*class="[^"]*article_card__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) || [, ""])[1])
      || decodeHtml((m[0].match(/aria-label="([^"]+)"/i) || [, ""])[1]);
    const lede = decodeHtml((inner.match(/article_card__lede"[^>]*>([\s\S]*?)<\/div>/i) || [, ""])[1]) || null;
    const date = isoDay((inner.match(/<time[^>]*datetime="([^"]+)"/i) || [, ""])[1]);
    if (!title || !isDrugAlert(title, lede)) continue;
    out.push(finish({
      source_record_id: slugify(m[1].replace(/^\/health\/news\//, "")),
      title, published_on: date, date_precision: "day",
      url: href, pdf_url: null, summary: lede && lede !== title ? lede : null,
      region: "MD", locality: "Baltimore", issuer: "Baltimore City Health Department",
      raw: { href },
    }));
  }
  return out;
}
