// Location reduction for external records. The contract (see CLAUDE.md
// "Location & the map"): nothing we publish is more precise than an H3 res-6
// cell (~36 km²). Upstream points are reduced here, before they reach the DB.
import { latLngToCell, cellToLatLng } from "https://esm.sh/h3-js@4.1.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const HEX_RES = 6;

export interface Geo {
  hex_cell: string | null;
  lat: number | null;
  lon: number | null;
  geo_precision: "hex" | "zip" | "city" | "county" | "state";
}

/** Reduce a precise point to its hex cell center. Returns null for junk coordinates. */
export function hexFromPoint(lat: unknown, lon: unknown): Geo | null {
  const la = typeof lat === "number" ? lat : Number(String(lat ?? "").replace("+", ""));
  const lo = typeof lon === "number" ? lon : Number(String(lon ?? "").replace("+", ""));
  if (!isFinite(la) || !isFinite(lo) || la === 0 || lo === 0) return null;
  if (la < 17 || la > 72 || lo < -180 || lo > -64) return null; // US incl. AK/HI/PR bounding box
  const cell = latLngToCell(la, lo, HEX_RES);
  const [cla, clo] = cellToLatLng(cell);
  return { hex_cell: cell, lat: round5(cla), lon: round5(clo), geo_precision: "hex" };
}

export function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

const STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "puerto rico": "PR",
};
const STATE_CODES = new Set(Object.values(STATE_NAMES));

export function normalizeState(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  const up = t.toUpperCase();
  if (STATE_CODES.has(up)) return up;
  return STATE_NAMES[t.toLowerCase()] ?? null;
}

/** Title-case a shouting city name ("CHICAGO" -> "Chicago"); leaves mixed case alone. */
export function tidyPlace(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.toUpperCase() === "N/A" || t.toUpperCase() === "UNKNOWN") return null;
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bMc(\w)/g, (_, c) => "Mc" + c.toUpperCase());
}

export type CountyCentroids = Map<string, { lat: number; lon: number }>;

/**
 * County centroid lookup keyed "ST|county name" (lowercase, without the word
 * "county"). Built from overdose_county_latest, which already joins CDC county
 * names to centroids, so every US county is covered once the CDC sync has run.
 */
export async function loadCountyCentroids(supabase: SupabaseClient): Promise<CountyCentroids> {
  const map: CountyCentroids = new Map();
  // PostgREST caps a single select at 1,000 rows regardless of .limit(); page.
  for (let from = 0; from < 10_000; from += 1000) {
    const { data, error } = await supabase.from("overdose_county_latest")
      .select("state, county, lat, lon").not("lat", "is", null).order("fips").range(from, from + 999);
    if (error) { console.warn("county centroids unavailable:", error.message); break; }
    const rows = (data ?? []) as { state: string | null; county: string | null; lat: number; lon: number }[];
    for (const r of rows) {
      if (!r.state || !r.county) continue;
      map.set(countyKey(r.state, r.county), { lat: r.lat, lon: r.lon });
    }
    if (rows.length < 1000) break;
  }
  return map;
}

export function countyKey(state: string, county: string): string {
  // CDC spells independent cities "Baltimore (city)"; keep them distinct from
  // the county of the same name ("baltimore city" vs "baltimore").
  const name = county.toLowerCase().replace(/\s*\(city\)$/, " city")
    .replace(/\s+(county|parish|borough|city and borough|census area|municipality)$/i, "")
    .replace(/\s*\(.*\)$/, "").trim();
  return `${state.toUpperCase()}|${name}`;
}

export function countyGeo(centroids: CountyCentroids, state: string | null, county: string | null): Geo {
  if (state && county) {
    const c = centroids.get(countyKey(state, county));
    if (c) return { hex_cell: null, lat: round5(c.lat), lon: round5(c.lon), geo_precision: "county" };
  }
  return { hex_cell: null, lat: null, lon: null, geo_precision: state ? "state" : "county" };
}

/** A city centroid is fine to publish as-is (it identifies a town, not a person). */
export function cityGeo(lat: unknown, lon: unknown): Geo | null {
  const la = Number(lat), lo = Number(lon);
  if (!isFinite(la) || !isFinite(lo) || la === 0) return null;
  return { hex_cell: null, lat: round5(la), lon: round5(lo), geo_precision: "city" };
}
