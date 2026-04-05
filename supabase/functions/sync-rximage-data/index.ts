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
const RXIMAGE_CDN = "https://rximage.nlm.nih.gov/image/images/gallery/original";
const API_TIMEOUT = 10_000;

// Map DailyMed shape strings to our enum
const SHAPE_MAP: Record<string, string> = {
  ROUND: "round", OVAL: "oval", CAPSULE: "capsule", DIAMOND: "diamond",
  TRIANGLE: "triangle", HEXAGON: "hexagon", RECTANGLE: "rectangle",
  SQUARE: "rectangle", PENTAGON: "other", FREEFORM: "other",
};

// Map DailyMed color strings to our enum
const COLOR_MAP: Record<string, string> = {
  WHITE: "white", BLUE: "blue", YELLOW: "yellow", PINK: "pink",
  GREEN: "green", ORANGE: "orange", RED: "red", PURPLE: "purple",
  GRAY: "gray", GREY: "gray", BROWN: "brown", TAN: "tan",
  BLACK: "gray", TURQUOISE: "blue", BEIGE: "tan",
};

// Map DailyMed score count to our enum
function mapScoring(splScore: number | null): string | null {
  if (splScore === null || splScore === undefined) return null;
  if (splScore <= 1) return "none";
  if (splScore === 2) return "single";
  if (splScore === 4) return "quad";
  return "other";
}

function parseSizeMm(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function normalizeColor(raw: string | null): string {
  if (!raw) return "white";
  const parts = raw.toUpperCase().split(/[;,\s]+/);
  if (parts.length > 1) return "multicolor";
  return COLOR_MAP[parts[0]] || "other";
}

function normalizeShape(raw: string | null): string {
  if (!raw) return "round";
  return SHAPE_MAP[raw.toUpperCase()] || "other";
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
        // Step 1: Get SPL setids for this drug
        const splData = await fetchJson(
          `${DAILYMED_BASE}/services/v2/spls.json?drug_name=${encodeURIComponent(drugName)}&pagesize=100`
        );
        const spls = splData?.data || [];

        for (const spl of spls) {
          if (totalRecords >= rLimit) break;
          const setId = spl.setid;
          if (!setId) continue;

          try {
            // Step 2: Get NDCs for this setid
            const ndcData = await fetchJson(
              `${DAILYMED_BASE}/services/v2/spls/${setId}/ndcs.json`
            );
            const ndcs = ndcData?.data || [];

            for (const ndcEntry of ndcs) {
              if (totalRecords >= rLimit) break;
              const ndc = ndcEntry.ndc_number || ndcEntry.product_ndc || ndcEntry;
              if (typeof ndc !== "string" || !ndc) continue;

              try {
                // Step 3: Get imprint data for this NDC
                const imprintData = await fetchJson(
                  `${DAILYMED_BASE}/services/v2/ndc/${ndc}/imprintdata.json`
                );
                const pills = imprintData?.data || [];

                for (const pill of pills) {
                  if (totalRecords >= rLimit) break;

                  const imprint = (pill.splimprint || "").trim();
                  if (!imprint) continue;

                  const shape = normalizeShape(pill.splshape);
                  const color = normalizeColor(pill.splcolor);
                  const key = dedupeKey(imprint, shape, color);

                  if (seenKeys.has(key)) {
                    stats.skipped++;
                    continue;
                  }
                  seenKeys.add(key);

                  const record = {
                    drug_name: pill.name || drugName,
                    imprint,
                    shape,
                    color,
                    size_mm: parseSizeMm(pill.splsize),
                    scoring: mapScoring(pill.splscore ? parseInt(pill.splscore, 10) : null),
                    ndc_code: ndc,
                    source: "dailymed",
                    last_synced: new Date().toISOString(),
                  };

                  // Check if record exists (dedupe on imprint+shape+color)
                  const { data: existing } = await supabase
                    .from("pill_reference")
                    .select("id")
                    .eq("imprint", imprint.toLowerCase())
                    .eq("shape", shape)
                    .eq("color", color)
                    .limit(1)
                    .maybeSingle();

                  if (existing) {
                    const { error } = await supabase
                      .from("pill_reference")
                      .update({ ...record, imprint: imprint.toLowerCase() })
                      .eq("id", existing.id);
                    if (!error) stats.updated++;
                    else stats.apiErrors++;
                  } else {
                    const { data: inserted, error } = await supabase
                      .from("pill_reference")
                      .insert({ ...record, imprint: imprint.toLowerCase() })
                      .select("id")
                      .single();
                    if (!error && inserted) {
                      stats.inserted++;

                      // Step 5: Try RxImage CDN for a reference image
                      try {
                        const rxUrl = `${RXIMAGE_CDN}/${ndc}.jpg`;
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
                }
              } catch (e) {
                console.warn(`Imprint fetch failed for NDC ${ndc}:`, e.message);
                stats.apiErrors++;
              }
            }
          } catch (e) {
            console.warn(`NDC fetch failed for setid ${setId}:`, e.message);
            stats.apiErrors++;
          }
        }
      } catch (e) {
        console.warn(`SPL search failed for ${drugName}:`, e.message);
        stats.apiErrors++;
      }
    }

    console.log("Sync complete:", JSON.stringify(stats));

    return new Response(
      JSON.stringify({ success: true, ...stats, drugNames }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sync-rximage-data error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
