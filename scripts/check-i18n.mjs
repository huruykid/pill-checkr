#!/usr/bin/env node
/**
 * i18n guard. Fails the build when:
 *   - a `t("…")` literal in src/ has no English entry (English renders the
 *     raw key, e.g. TESTSTRIP.TITLE on the test-strip card — this shipped
 *     unnoticed for months because nothing checked it);
 *   - a dynamic `t(`prefix.${x}`)` has no English key with that prefix;
 *   - an ENABLED locale (the LANGUAGES array in useI18n.tsx) is below the
 *     coverage threshold (default 100%).
 * Warns (never fails) on values containing the word "safe" so a human can
 * confirm they are negations, and on disabled locales' coverage.
 *
 * Limitation: it only sees t() keys, not hardcoded JSX text.
 * Run: npm run check:i18n   (also runs before ios:sync / ios:copy)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const I18N = join(ROOT, "src/hooks/useI18n.tsx");
const SRC = join(ROOT, "src");
const minCoverage = Number((process.argv.find((a) => a.startsWith("--min-coverage=")) || "").split("=")[1] || 100);

const text = readFileSync(I18N, "utf8");

// Locale blocks: `  en: {` … `  },`
const blocks = {};
const blockRe = /^  (en|es|fr|pt): \{\n([\s\S]*?)\n  \},?$/gm;
let m;
while ((m = blockRe.exec(text))) {
  const keys = new Map();
  for (const line of m[2].split("\n")) {
    const km = line.match(/^\s*"([^"]+)"\s*:\s*(.*)$/);
    if (km) keys.set(km[1], km[2]);
  }
  blocks[m[1]] = keys;
}
if (!blocks.en) {
  console.error("check-i18n: could not find the `en` block in useI18n.tsx");
  process.exit(2);
}
const enabledMatch = text.match(/const LANGUAGES: Language\[\] = \[([^\]]*)\]/);
const enabled = enabledMatch ? [...enabledMatch[1].matchAll(/"(\w+)"/g)].map((x) => x[1]) : ["en"];

// Collect t() usages.
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name) && p !== I18N) files.push(p);
  }
})(SRC);

const literal = new Map(); // key -> [file:line]
const prefixes = new Map(); // prefix -> [file:line]
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    const where = `${relative(ROOT, f)}:${i + 1}`;
    for (const mm of line.matchAll(/\bt\(\s*"([^"]+)"\s*[),]/g)) literal.set(mm[1], [...(literal.get(mm[1]) || []), where]);
    for (const mm of line.matchAll(/\bt\(\s*'([^']+)'\s*[),]/g)) literal.set(mm[1], [...(literal.get(mm[1]) || []), where]);
    for (const mm of line.matchAll(/\bt\(\s*`([^`$]+)\$\{[^`]*`\s*[),]/g)) prefixes.set(mm[1], [...(prefixes.get(mm[1]) || []), where]);
    for (const mm of line.matchAll(/\bt\(\s*`([^`$]+)`\s*[),]/g)) literal.set(mm[1], [...(literal.get(mm[1]) || []), where]);
  });
}

let errors = 0;
const en = blocks.en;

const missingLiteral = [...literal.keys()].filter((k) => !en.has(k)).sort();
if (missingLiteral.length) {
  errors += missingLiteral.length;
  console.error(`\n✖ ${missingLiteral.length} t() key(s) missing from en (English would render the raw key):`);
  for (const k of missingLiteral) console.error(`   ${k}   ← ${literal.get(k).slice(0, 3).join(", ")}`);
}
const enKeys = [...en.keys()];
const missingPrefix = [...prefixes.keys()].filter((p) => !enKeys.some((k) => k.startsWith(p)));
if (missingPrefix.length) {
  errors += missingPrefix.length;
  console.error(`\n✖ dynamic t() prefix(es) with no en keys:`);
  for (const p of missingPrefix) console.error(`   ${p}…   ← ${prefixes.get(p).slice(0, 3).join(", ")}`);
}

console.log("\nLocale coverage (vs en):");
console.log("  locale  enabled  keys   missing  coverage");
for (const [loc, keys] of Object.entries(blocks)) {
  const missing = enKeys.filter((k) => !keys.has(k));
  const coverage = Math.round(((enKeys.length - missing.length) / enKeys.length) * 1000) / 10;
  const isOn = enabled.includes(loc);
  console.log(`  ${loc.padEnd(6)}  ${String(isOn).padEnd(7)}  ${String(keys.size).padEnd(5)}  ${String(missing.length).padEnd(7)}  ${coverage}%`);
  if (isOn && coverage < minCoverage) {
    errors++;
    console.error(`✖ ${loc} is enabled but only ${coverage}% complete (min ${minCoverage}%). Missing by prefix:`);
    const byPrefix = {};
    for (const k of missing) { const px = k.split(".")[0]; byPrefix[px] = (byPrefix[px] || 0) + 1; }
    console.error("   " + Object.entries(byPrefix).map(([k, v]) => `${k} ${v}`).join(", "));
  }
  const extra = [...keys.keys()].filter((k) => !en.has(k));
  if (extra.length) console.log(`  ⚠ ${loc} has ${extra.length} key(s) not in en: ${extra.slice(0, 6).join(", ")}${extra.length > 6 ? "…" : ""}`);
}

// "safe" audit: harm-reduction copy must never promise safety.
const safeHits = [];
for (const [loc, keys] of Object.entries(blocks)) {
  if (!enabled.includes(loc)) continue;
  for (const [k, v] of keys) if (/\bsafe\b/i.test(v) || /\bsegur[oa]s?\b/i.test(v)) safeHits.push(`${loc}:${k}`);
}
if (safeHits.length) {
  console.log(`\n⚠ ${safeHits.length} enabled value(s) contain "safe"/"seguro" — confirm each is a negation ("not proof a pill is safe"):`);
  for (const h of safeHits) console.log(`   ${h}`);
}

if (errors) {
  console.error(`\ncheck-i18n: ${errors} error(s).`);
  process.exit(1);
}
console.log("\ncheck-i18n: ok");
