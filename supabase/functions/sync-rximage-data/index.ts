import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_DRUG_NAMES = [
  "oxycodone", "hydrocodone", "fentanyl", "alprazolam", "clonazepam",
  "diazepam", "lorazepam", "amphetamine", "methylphenidate", "tramadol",
  "methadone", "buprenorphine", "morphine", "codeine", "carisoprodol",
];

const DAILYMED_BASE = "https://dailymed.nlm.nih.gov/dailymed";
const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";
const RXIMAGE_CDN = "https://rximage.nlm.nih.gov/image/images/gallery/original";
const API_TIMEOUT = 10_000;

// DailyMed SHAPE codes (FDA SPL) → our enum
const SHAPE_CODE_MAP: Record<string, string> = {
  C48345: "oval",       // OVAL
  C48348: "round",      // ROUND
  C48336: "capsule",    // CAPSULE
  C48335: "capsule",    // CAPSULE (alt)
  C48340: "hexagon",    // HEXAGON
  C48338: "diamond",    // DIAMOND
  C48344: "other",      // PENTAGON
  C48346: "rectangle",  // RECTANGLE
  C48347: "rectangle",  // SQUARE
  C48349: "triangle",   // TRIANGLE
  C48337: "other",      // D SHAPE
  C48339: "other",      // FREEFORM
  C48341: "other",      // KIDNEY BEAN
  C48342: "other",      // MODIFIED RECTANGLE
  C48343: "other",      // OCTAGON
};

// DailyMed COLOR text → our enum
const COLOR_MAP: Record<string, string> = {
  WHITE: "white", BLUE: "blue", YELLOW: "yellow", PINK: "pink",
  GREEN: "green", ORANGE: "orange", RED: "red", PURPLE: "purple",
  GRAY: "gray", GREY: "gray", BROWN: "brown", TAN: "tan",
  BLACK: "gray", TURQUOISE: "blue", BEIGE: "tan",
};

function mapScoring(score: number | null): string | null {
  if (score === null || score === undefined) return null;
  if (score <= 1) return "none";
  if (score === 2) return "single";
  if (score === 4) return "quad";
  return "other";
}

function parseSizeMm(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function normalizeColor(raw: string | null): string {
  if (!raw) return "white";
  // Strip parenthetical content like "white(110)"
  const cleaned = raw.replace(/\(.*?\)/g, "").trim().toUpperCase();
  const parts = cleaned.split(/[;,\s\/]+/).filter(Boolean);
  if (parts.length > 1) return "multicolor";
  return COLOR_MAP[parts[0]] || "other";
}

function normalizeShape(code: string | null): string {
  if (!code) return "round";
  return SHAPE_CODE_MAP[code.toUpperCase()] || "other";
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeKey(imprint: string, shape: string, color: string): string {
  return `${(imprint || "").toLowerCase().trim()}|${shape}|${color}`;
}

function extractProps(propertyConcepts: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pc of propertyConcepts || []) {
    map[pc.propName] = pc.propValue;
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const drugNames: string[] = body.drugNames || DEFAULT_DRUG_NAMES;
    const rLimit: number = Math.min(body.rLimit ?? 50, 200);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const stats = { inserted: 0, updated: 0, skipped: 0, imagesAdded: 0, apiErrors: 0, totalProcessed: 0 };
    const seenKeys = new Set<string>();
    let totalRecords = 0;

    for (const drugName of drugNames) {
      if (totalRecords >= rLimit) break;

      try {
        // Step 1: Get SPL setids from DailyMed
        const splData = await fetchJson(
          `${DAILYMED_BASE}/services/v2/spls.json?drug_name=${encodeURIComponent(drugName)}&pagesize=50`
        );
        const spls = splData?.data || [];

        for (const spl of spls) {
          if (totalRecords >= rLimit) break;
          const setId = spl.setid;
          if (!setId) continue;

          try {
            // Step 2: Get NDCs from DailyMed (ndcs is under data.ndcs)
            const ndcData = await fetchJson(
              `${DAILYMED_BASE}/services/v2/spls/${setId}/ndcs.json`
            );
            const ndcs = ndcData?.data?.ndcs || [];

            for (const ndcEntry of ndcs) {
              if (totalRecords >= rLimit) break;
              const ndc = ndcEntry.ndc || ndcEntry;
              if (typeof ndc !== "string" || !ndc) continue;

              try {
                // Step 3: Get pill properties from RxNav
                const propsData = await fetchJson(
                  `${RXNAV_BASE}/ndcproperties.json?id=${encodeURIComponent(ndc)}`
                );
                const ndcProps = propsData?.ndcPropertyList?.ndcProperty;
                if (!ndcProps || ndcProps.length === 0) continue;

                const prop = ndcProps[0];
                const concepts = extractProps(
                  prop.propertyConceptList?.propertyConcept || []
                );

                const imprintRaw = concepts.IMPRINT_CODE || "";
                const imprint = imprintRaw.replace(/;/g, " ").trim();
                if (!imprint) continue;

                const shape = normalizeShape(concepts.SHAPE);
                const color = normalizeColor(concepts.COLORTEXT);
                const key = dedupeKey(imprint, shape, color);

                if (seenKeys.has(key)) {
                  stats.skipped++;
                  continue;
                }
                seenKeys.add(key);

                // Get drug name from RxCUI
                let resolvedDrugName = drugName;
                const rxcui = prop.rxcui;
                if (rxcui) {
                  try {
                    const rxProps = await fetchJson(
                      `${RXNAV_BASE}/rxcui/${rxcui}/properties.json`
                    );
                    const rxName = rxProps?.properties?.name;
                    if (rxName) {
                      // Extract just the drug name (before dosage info)
                      resolvedDrugName = rxName.split(/\s+\d/)[0].trim() || drugName;
                    }
                  } catch {
                    // Use search term as fallback
                  }
                }

                const record = {
                  drug_name: resolvedDrugName,
                  imprint: imprint.toLowerCase(),
                  shape,
                  color,
                  size_mm: parseSizeMm(concepts.SIZE),
                  scoring: mapScoring(concepts.SCORE ? parseInt(concepts.SCORE, 10) : null),
                  ndc_code: ndc,
                  source: "dailymed",
                  last_synced: new Date().toISOString(),
                };

                // Upsert: check existing by imprint+shape+color
                const { data: existing } = await supabase
                  .from("pill_reference")
                  .select("id")
                  .eq("imprint", record.imprint)
                  .eq("shape", shape)
                  .eq("color", color)
                  .limit(1)
                  .maybeSingle();

                if (existing) {
                  const { error } = await supabase
                    .from("pill_reference")
                    .update(record)
                    .eq("id", existing.id);
                  if (!error) stats.updated++;
                  else stats.apiErrors++;
                } else {
                  const { data: inserted, error } = await supabase
                    .from("pill_reference")
                    .insert(record)
                    .select("id")
                    .single();

                  if (!error && inserted) {
                    stats.inserted++;

                    // Step 5: Try RxImage CDN for a reference image
                    try {
                      const rxUrl = `${RXIMAGE_CDN}/${ndc.replace(/-/g, "")}.jpg`;
                      const imgRes = await fetch(rxUrl, {
                        method: "HEAD",
                        signal: AbortSignal.timeout(5000),
                      });
                      if (imgRes.ok) {
                        const { error: imgErr } = await supabase
                          .from("pill_reference_images")
                          .insert({
                            pill_reference_id: inserted.id,
                            image_url: rxUrl,
                            source: "rximage_cdn",
                          });
                        if (!imgErr) stats.imagesAdded++;
                      }
                    } catch {
                      // CDN unavailable — graceful skip
                    }
                  } else {
                    stats.apiErrors++;
                  }
                }

                totalRecords++;
                stats.totalProcessed++;
              } catch (e) {
                console.warn(`Props fetch failed for NDC ${ndc}:`, e instanceof Error ? e.message : String(e));
                stats.apiErrors++;
              }
            }
          } catch (e) {
            console.warn(`NDC fetch failed for setid ${setId}:`, e instanceof Error ? e.message : String(e));
            stats.apiErrors++;
          }
        }
      } catch (e) {
        console.warn(`SPL search failed for ${drugName}:`, e instanceof Error ? e.message : String(e));
        stats.apiErrors++;
      }
    }

    console.log("Sync complete:", JSON.stringify(stats));

    return new Response(
      JSON.stringify({ success: true, ...stats, drugNames }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("sync-rximage-data error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
