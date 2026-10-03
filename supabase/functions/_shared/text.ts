// Dependency-free text helpers (importable by unit tests without network).
export function decodeHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#8217;|&rsquo;/g, "’").replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“").replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&ndash;|&#8211;/g, "–").replace(/&mdash;|&#8212;/g, "—")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}

/** "Jun 22, 2026" | "06/22/2026" | "2026-06-22T12:00:00Z" | "6/22/2026" -> "2026-06-22" */
export function isoDay(s: unknown): string | null {
  if (typeof s !== "string" || !s.trim()) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const d = new Date(t + (/(UTC|GMT|Z|[+-]\d{2}:?\d{2})$/.test(t) ? "" : " UTC"));
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function isoDayFromEpochMs(v: unknown): string | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!isFinite(n) || n <= 0) return null;
  return new Date(n).toISOString().slice(0, 10);
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

export function str(v: unknown): string | null {
  if (typeof v !== "string") return v === null || v === undefined ? null : String(v);
  const t = v.trim();
  return t && t.toUpperCase() !== "N/A" ? t : null;
}

export function zip5(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const m = s.match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}
