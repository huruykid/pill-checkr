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
// Current-year sections are <h2>Alerts, 2026</h2><ul><li><a href=".../han/alert/2026/x.pdf">Alert #26: ...</a>
// and older years sit in collapsible "Alerts Archive" / "Advisories Archive"
// blocks with no year in the heading. The PDF path carries kind and year for
// every item, so parse anchors by path rather than by section.
// ---------------------------------------------------------------------------
export function parseNycHan(html: string, base = "https://www.nyc.gov/"): ParsedAlert[] {
  const out: ParsedAlert[] = [];
  const aRe = /<a[^>]*href="([^"]*\/han\/(alert|advisory|update|notification)s?\/(\d{4})\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let a: RegExpExecArray | null;
  while ((a = aRe.exec(html))) {
    const href = abs(base, a[1]);
    const kind = a[2].charAt(0).toUpperCase() + a[2].slice(1).toLowerCase();
    const year = a[3];
    const title = decodeHtml(a[4]);
    if (!title || !isDrugAlert(title)) continue;
    const file = href.split("/").pop()?.replace(/\.pdf$/i, "") ?? slugify(title);
    out.push(finish({
      source_record_id: `nyc-${year}-${slugify(file)}`,
      title, published_on: `${year}-01-01`, date_precision: "year",
      url: "https://www.nyc.gov/site/doh/providers/resources/health-alert-network.page",
      pdf_url: href,
      summary: `${kind} from the NYC Health Department, ${year}.`,
      region: "NY", locality: "New York City", issuer: "NYC Department of Health and Mental Hygiene",
      raw: { kind, year, href },
    }));
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

// ---------------------------------------------------------------------------
// Los Angeles County DPH — LAHAN (publichealth.lacounty.gov/lahan/)
// Items are <div class="col-2"><img alt="April 3, 2026"></div> followed by
// <div class="col-10"><strong>Title</strong><br>Issuer Type<br><a href=x.pdf>PDF</a> | <a>Web/Mobile</a></div>.
// LA DPH relays CDC and CDPH notices on the same list; `kind` names the issuer.
// ---------------------------------------------------------------------------
export function parseLahan(html: string, base = "https://publichealth.lacounty.gov/"): ParsedAlert[] {
  const out: ParsedAlert[] = [];
  const itemRe = /<div[^>]*class="col-2"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="col-10"[^>]*>([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(html))) {
    const date = isoDay((m[1].match(/<img[^>]*alt="([^"]+)"/i) || [, ""])[1]);
    const body = m[2];
    const strong = (body.match(/<strong>([\s\S]*?)<\/strong>/i) || [, ""])[1];
    // Some rows put the issuer line inside <strong> on its own line.
    const strongLines = decodeHtml(strong.replace(/\r?\n|\t/g, "\n")).split(/\s{2,}|\n/).map((s) => s.trim()).filter(Boolean);
    const rawLines = strong.split(/\r?\n/).map((s) => decodeHtml(s)).filter(Boolean);
    const title = rawLines[0] ?? strongLines[0] ?? "";
    const kindInStrong = rawLines.slice(1).join(" ").trim();
    const afterStrong = decodeHtml(body.replace(/<strong>[\s\S]*?<\/strong>/i, "").replace(/<a[\s\S]*$/i, ""));
    const kind = (kindInStrong || afterStrong).replace(/\s+/g, " ").trim();
    if (!title || !isDrugAlert(title)) continue;
    const links = [...body.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((a) => ({ href: abs(base, a[1].split("?")[0]), text: decodeHtml(a[2]) }));
    const pdf = links.find((l) => /\.pdf$/i.test(l.href))?.href ?? null;
    const web = links.find((l) => !/\.pdf$/i.test(l.href))?.href ?? null;
    const isCdc = /^CDC\b/i.test(kind);
    const isCdph = /^CDPH\b/i.test(kind);
    const file = pdf ? pdf.split("/").pop()!.replace(/\.pdf$/i, "") : slugify(`${date ?? ""}-${title}`);
    out.push(finish({
      source_record_id: `lahan-${slugify(file)}`,
      title, published_on: date, date_precision: "day",
      url: web ?? "https://publichealth.lacounty.gov/lahan/", pdf_url: pdf,
      summary: kind ? `${kind}, as distributed by the Los Angeles County Health Alert Network.` : null,
      region: isCdc ? "US" : "CA",
      locality: isCdc ? null : isCdph ? null : "Los Angeles County",
      issuer: isCdc ? "CDC (via LA County DPH)" : isCdph ? "California Department of Public Health (via LA County DPH)" : "Los Angeles County Department of Public Health",
      raw: { kind, pdf, web },
    }));
  }
  return out;
}
