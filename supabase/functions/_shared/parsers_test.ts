// deno test supabase/functions/_shared/parsers_test.ts
// Self-contained asserts: the Supabase functions folder has no node_modules and
// jsr/esm are not reachable from every CI sandbox.
function assertEquals(actual: unknown, expected: unknown, msg?: string): void {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(msg ?? `expected ${e}, got ${a}`);
}
function assert(cond: unknown, msg = "assertion failed"): void {
  if (!cond) throw new Error(msg);
}
import { parsePhillyHip, parseNycHan, parseWaDohHan, parseBaltimoreNews } from "./alertParsers.ts";
import { parseSubstances, flagsFor, DRUG_DEATH_RE } from "./substances.ts";
import { isoDay, zip5, decodeHtml } from "./text.ts";

const fx = (n: string) => Deno.readTextFileSync(new URL(`./fixtures/${n}`, import.meta.url));

Deno.test("Philly HIP: keeps drug alerts, drops measles, parses dates and ids", () => {
  const out = parsePhillyHip(fx("hip.html"));
  assertEquals(out.map((a) => a.source_record_id), ["hip-6386", "hip-5891", "hip-17"]);
  assertEquals(out[0].published_on, "2026-06-22");
  assertEquals(out[0].pdf_url, "https://hip.phila.gov/document/6386/PDPH-HAN-MWD-06.22.2026.pdf/");
  assert(out[0].substances.includes("Medetomidine"));
  assertEquals(out[1].title, "Carfentanil detected in Philadelphia’s drug supply");
  assertEquals(out[1].severity, "danger");
  assert(out[2].substances.includes("Counterfeit pills") && out[2].substances.includes("Fentanyl"));
  assertEquals(out[0].region, "PA");
  assertEquals(out[0].locality, "Philadelphia");
});

Deno.test("NYC HAN: year-level dates, drug items only, stable ids", () => {
  const out = parseNycHan(fx("nyc.html"));
  assertEquals(out.length, 3);
  assertEquals(out[0].date_precision, "year");
  assertEquals(out[0].published_on, "2026-01-01");
  assertEquals(out[0].source_record_id, "nyc-2026-han-advisory-2-medetomidine");
  assertEquals(out[1].source_record_id, "nyc-2025-han-alert-9-bromazolam");
  assertEquals(out[2].source_record_id, "nyc-2024-han-advisory-20-carfentanil");
  assertEquals(out[2].published_on, "2024-01-01");
  assert(out[1].substances.includes("Novel benzodiazepines"));
  assert(out[1].substances.includes("Fentanyl"));
});

Deno.test("WA DOH HAN: CDC relays become US-region alerts keyed by HAN number", () => {
  const out = parseWaDohHan(fx("wa.html"));
  assertEquals(out.length, 2);
  assertEquals(out[0].source_record_id, "cdc-han-527");
  assertEquals(out[0].region, "US");
  assertEquals(out[0].published_on, "2026-04-02");
  assertEquals(out[0].url, "https://www.cdc.gov/han/php/notices/han00527.html");
  assertEquals(out[1].region, "WA");
  assertEquals(out[1].issuer, "Washington State Department of Health");
  assertEquals(out[1].pdf_url, "https://doh.wa.gov/sites/default/files/2024-01/opioid-overdose-events.pdf");
});

Deno.test("Baltimore news: drug items only, date from <time>", () => {
  const out = parseBaltimoreNews(fx("baltimore.html"));
  assertEquals(out.length, 1);
  assertEquals(out[0].source_record_id, "the-ongoing-threat-of-medetomidine-in-illicit-drug-supply");
  assertEquals(out[0].published_on, "2026-06-11");
  assertEquals(out[0].url, "https://www.baltimorecity.gov/health/news/the-ongoing-threat-of-medetomidine-in-illicit-drug-supply");
  assert(out[0].substances.includes("Medetomidine"));
});

Deno.test("substances: medical-examiner phrasing", () => {
  const s = parseSubstances("Acute Intoxication by the Combined Effects of Fentanyl, para-Fluorofentanyl, Xylazine and Cocaine");
  assertEquals(s, ["Fentanyl", "Fentanyl analogs", "Xylazine", "Cocaine"]);
  const f = flagsFor(s);
  assert(f.fentanyl && f.fentanyl_analog && f.xylazine && f.any_opioid && f.stimulant);
  assertEquals(parseSubstances("ACUTE HEROIN TOXICITY"), ["Heroin"]);
  assertEquals(parseSubstances("Mixed drug (fentanyl; eutylone; mitragynine; methamphetamine; alprazolam and 4-ANPP) and alcohol toxicity"),
    ["Fentanyl", "4-ANPP (fentanyl precursor)", "Methamphetamine", "Synthetic cathinones", "Benzodiazepines", "Alcohol", "Kratom (mitragynine)"]);
  assertEquals(parseSubstances("1,1-Difluoroethane"), ["Difluoroethane (inhalant)"]);
  // "fentanyl analog" alone must not count as plain fentanyl
  assertEquals(parseSubstances("fentanyl analog detected"), ["Fentanyl analogs"]);
  assert(DRUG_DEATH_RE.test("Acute fentanyl and methamphetamine intoxication"));
  assert(!DRUG_DEATH_RE.test("Hypertensive cardiovascular disease"));
});

Deno.test("text helpers", () => {
  assertEquals(isoDay("Jun 22, 2026"), "2026-06-22");
  assertEquals(isoDay("06/22/2026"), "2026-06-22");
  assertEquals(isoDay("4/30/2026"), "2026-04-30");
  assertEquals(isoDay("2026-06-30T12:00:00Z"), "2026-06-30");
  assertEquals(isoDay("2023-01-02T00:00:00.000"), "2023-01-02");
  assertEquals(zip5("95050-1234"), "95050");
  assertEquals(zip5("N/A"), null);
  assertEquals(decodeHtml("Philadelphia&#8217;s <b>drug</b> supply"), "Philadelphia’s drug supply");
});
