import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const InputSchema = z.object({
  image: z.string()
    .min(1, "Image data is required")
    .max(15 * 1024 * 1024, "Image data exceeds maximum size of 15MB"),
  backImage: z.string().max(15 * 1024 * 1024).optional().nullable(),
  imprint: z.string().max(50, "Imprint must be 50 characters or less").optional().nullable(),
  shape: z.enum(['round', 'oval', 'capsule', 'diamond', 'triangle', 'hexagon', 'rectangle', 'other']).optional().nullable(),
  color: z.enum(['white', 'blue', 'yellow', 'pink', 'green', 'orange', 'red', 'purple', 'gray', 'brown', 'tan', 'multicolor', 'other']).optional().nullable(),
  scoring: z.enum(['none', 'single', 'double', 'quad', 'other']).optional().nullable(),
  estimatedSizeMm: z.number().positive().max(50).optional().nullable(),
  hasReferenceObject: z.boolean().default(false),
  photoUrl: z.string().optional().nullable(),
  backPhotoUrl: z.string().optional().nullable(),
});

// Match scoring weights (total max ~115)
const MATCH_WEIGHTS = {
  imprintExact: 40,
  imprintPartial: 20,
  shape: 12,
  color: 12,
  scoring: 8,
  sizeExact: 8,   // within ±0.5mm
  sizeClose: 4,   // within ±1mm
  logoMatch: 10,  // logo description match
  visualSimilarity: 25, // max bonus from visual comparison
};

// Color proximity map: partial credit for similar colors (0-1 scale, 1 = identical)
const COLOR_PROXIMITY: Record<string, Record<string, number>> = {
  pink:   { red: 0.6, purple: 0.3 },
  red:    { pink: 0.6, orange: 0.4 },
  blue:   { purple: 0.5 },
  purple: { blue: 0.5, pink: 0.3 },
  orange: { yellow: 0.5, red: 0.4, tan: 0.3 },
  yellow: { orange: 0.5, tan: 0.4, green: 0.2 },
  tan:    { brown: 0.6, yellow: 0.4, orange: 0.3 },
  brown:  { tan: 0.6 },
  gray:   { white: 0.4 },
  white:  { gray: 0.4 },
  green:  { yellow: 0.2 },
};

function getColorProximity(a: string, b: string): number {
  if (a === b) return 1;
  return COLOR_PROXIMITY[a]?.[b] ?? 0;
}

// Thresholds for confidence levels (adjusted for new max score of ~110)
const CONFIDENCE_THRESHOLDS = {
  high: 80,
  medium: 50,
};

const SOURCE_PRIORITY: Record<string, number> = {
  manual: 3,
  rximage: 2,
  dailymed: 1,
};

// Calculate match score between extracted features and reference pill
function calculateMatchScore(
  extracted: { imprint: string | null; backImprint: string | null; shape: string | null; color: string | null; scoring: string | null; sizeMm: number | null; detectedLogos: Array<{ name: string; confidence: string; description: string }> | null },
  reference: { imprint: string; shape: string; color: string; scoring: string | null; size_mm: number | null; logo_description: string | null }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (reference.imprint) {
    const refNorm = reference.imprint.toLowerCase().replace(/\s+/g, "");
    const frontNorm = extracted.imprint?.toLowerCase().replace(/\s+/g, "") || "";
    const backNorm = extracted.backImprint?.toLowerCase().replace(/\s+/g, "") || "";
    
    // Check front imprint
    if (frontNorm && frontNorm === refNorm) {
      score += MATCH_WEIGHTS.imprintExact;
      reasons.push("Imprint matches exactly");
    } else if (frontNorm && (refNorm.includes(frontNorm) || frontNorm.includes(refNorm))) {
      score += MATCH_WEIGHTS.imprintPartial;
      reasons.push("Imprint partially matches");
    } else if (backNorm && backNorm === refNorm) {
      // Back imprint exact match
      score += MATCH_WEIGHTS.imprintExact;
      reasons.push("Back imprint matches exactly");
    } else if (backNorm && (refNorm.includes(backNorm) || backNorm.includes(refNorm))) {
      score += MATCH_WEIGHTS.imprintPartial;
      reasons.push("Back imprint partially matches");
    }
  }

  if (extracted.shape && reference.shape && extracted.shape === reference.shape) {
    score += MATCH_WEIGHTS.shape;
    reasons.push("Shape matches");
  }

  if (extracted.color && reference.color) {
    const proximity = getColorProximity(extracted.color, reference.color);
    if (proximity === 1) {
      score += MATCH_WEIGHTS.color;
      reasons.push("Color matches");
    } else if (proximity > 0) {
      score += Math.round(MATCH_WEIGHTS.color * proximity);
      reasons.push(`Color similar (${extracted.color} ≈ ${reference.color})`);
    }
  }

  // Scoring pattern match
  if (extracted.scoring && reference.scoring) {
    if (extracted.scoring === reference.scoring) {
      score += MATCH_WEIGHTS.scoring;
      reasons.push("Scoring pattern matches");
    }
  }

  // Size match with tolerance
  if (extracted.sizeMm && reference.size_mm) {
    const deviation = Math.abs(extracted.sizeMm - reference.size_mm);
    if (deviation <= 0.5) {
      score += MATCH_WEIGHTS.sizeExact;
      reasons.push(`Size matches (±${deviation.toFixed(1)}mm)`);
    } else if (deviation <= 1.0) {
      score += MATCH_WEIGHTS.sizeClose;
      reasons.push(`Size close (±${deviation.toFixed(1)}mm)`);
    }
  }

  // Logo match
  if (extracted.detectedLogos && extracted.detectedLogos.length > 0 && reference.logo_description) {
    const refLogoLower = reference.logo_description.toLowerCase();
    const logoMatched = extracted.detectedLogos.some(
      logo => refLogoLower.includes(logo.name.toLowerCase()) || logo.name.toLowerCase().includes(refLogoLower.split(" ")[0])
    );
    if (logoMatched) {
      score += MATCH_WEIGHTS.logoMatch;
      reasons.push("Logo matches reference");
    }
  }

  return { score, reasons };
}

// Calculate anomaly score based on inconsistencies
function calculateAnomalyScore(
  extracted: { imprint: string | null; shape: string | null; color: string | null; imprintConfidence: string; scoring: string | null; sizeMm: number | null },
  topMatch: { imprint: string; shape: string; color: string; scoring: string | null; size_mm: number | null } | null,
  imageQuality: string,
  visualMismatch: boolean,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (!extracted.imprint) {
    score += 25;
    reasons.push("Imprint could not be read or detected");
  } else if (extracted.imprintConfidence === "low") {
    score += 15;
    reasons.push("Imprint text recognition was uncertain");
  }

  if (imageQuality === "poor") {
    score += 30;
    reasons.push("Image quality is poor, affecting analysis accuracy");
  } else if (imageQuality === "fair") {
    score += 10;
    reasons.push("Image quality is fair, some details may be unclear");
  }

  if (topMatch && extracted.imprint) {
    const extractedNorm = extracted.imprint.toLowerCase().replace(/\s+/g, "");
    const refNorm = topMatch.imprint.toLowerCase().replace(/\s+/g, "");
    
    if (extractedNorm !== refNorm && !refNorm.includes(extractedNorm) && !extractedNorm.includes(refNorm)) {
      score += 20;
      reasons.push("Imprint differs from closest reference match");
    }
  }

  if (topMatch && extracted.shape && extracted.shape !== topMatch.shape) {
    score += 15;
    reasons.push("Shape doesn't match typical reference for this pill");
  }

  if (topMatch && extracted.color && extracted.color !== topMatch.color) {
    const proximity = getColorProximity(extracted.color, topMatch.color);
    if (proximity === 0) {
      score += 15;
      reasons.push("Color doesn't match typical reference for this pill");
    } else if (proximity < 0.5) {
      score += 5;
      reasons.push(`Color is similar but not exact (${extracted.color} vs ${topMatch.color})`);
    }
    // proximity >= 0.5: skip penalty entirely — colors are close enough
  }

  // Visual mismatch is a strong counterfeit signal
  if (visualMismatch) {
    score += 25;
    reasons.push("Visual appearance differs significantly from legitimate reference images — possible counterfeit indicator");
  }

  // Size deviation anomaly
  if (extracted.sizeMm && topMatch?.size_mm) {
    const deviation = Math.abs(extracted.sizeMm - topMatch.size_mm);
    if (deviation > 2) {
      score += 20;
      reasons.push(`Size deviates significantly from reference (${deviation.toFixed(1)}mm difference)`);
    } else if (deviation > 1) {
      score += 10;
      reasons.push(`Size slightly differs from reference (${deviation.toFixed(1)}mm difference)`);
    }
  }

  // Scoring pattern mismatch
  if (extracted.scoring && topMatch?.scoring && extracted.scoring !== topMatch.scoring) {
    score += 15;
    reasons.push(`Scoring pattern doesn't match reference (${extracted.scoring} vs ${topMatch.scoring})`);
  }

  if (!topMatch) {
    score += 25;
    reasons.push("No matching pill found in reference database");
  }

  return { score: Math.min(score, 100), reasons };
}

// Derive risk level from confidence and anomaly
function deriveRiskLevel(
  matchConfidence: "low" | "medium" | "high",
  anomalyScore: number,
  imageQuality: string
): { level: "low" | "medium" | "high"; reasons: string[] } {
  const reasons: string[] = [];
  let riskPoints = 0;
  
  if (matchConfidence === "low") {
    riskPoints += 40;
    reasons.push("Unable to confidently match this pill to known references");
  } else if (matchConfidence === "medium") {
    riskPoints += 20;
    reasons.push("Match confidence is moderate, not definitive");
  } else {
    reasons.push("Pill closely matches a known reference");
  }

  if (anomalyScore >= 50) {
    riskPoints += 40;
    reasons.push("High inconsistency detected between pill features");
  } else if (anomalyScore >= 25) {
    riskPoints += 20;
    reasons.push("Some inconsistencies noted in pill features");
  }

  if (imageQuality === "poor") {
    riskPoints += 20;
    reasons.push("Poor image quality limits analysis accuracy");
  }

  let level: "low" | "medium" | "high" = "low";
  if (riskPoints >= 50) {
    level = "high";
  } else if (riskPoints >= 25) {
    level = "medium";
  }

  return { level, reasons };
}

// ─── Visual comparison with reference images ────────────────────────────────
async function runVisualComparison(
  userImage: string,
  matchesWithImages: Array<{ id: string; drug_name: string }>,
  referenceImages: Record<string, string[]>,
  lovableKey: string,
): Promise<Record<string, { similarity: number; redFlags: string[]; assessment: string }>> {
  const results: Record<string, { similarity: number; redFlags: string[]; assessment: string }> = {};

  // Build image content array: user photo first, then reference images with labels
  const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: "USER'S PILL PHOTO:" },
    { type: "image_url", image_url: { url: userImage } },
  ];

  for (const match of matchesWithImages) {
    const urls = (referenceImages[match.id] || []).slice(0, 2);
    imageContent.push({ type: "text", text: `REFERENCE — ${match.drug_name} (id: ${match.id}):` });
    for (const url of urls) {
      imageContent.push({ type: "image_url", image_url: { url } });
    }
  }

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a pill visual comparison expert for harm reduction. Compare a user's pill photo against reference images of known legitimate pills.

For each reference pill provided, assess visual similarity on a 0–100 scale considering:
- Font style, spacing, depth, and quality of imprint text (counterfeits often use wrong fonts or shallow stamps)
- Color shade accuracy (counterfeits may be slightly off-shade)
- Shape proportions and edge quality (counterfeits often have rough or uneven edges)
- Scoring/break line patterns
- Surface texture and finish (glossy vs matte, smooth vs rough)
- Any visual red flags (off-center imprint, uneven coloring, speckled texture, wrong size)

Respond with JSON only:
{
  "comparisons": [
    {
      "reference_id": "uuid",
      "visual_similarity": 0-100,
      "red_flags": ["list of specific visual concerns"],
      "assessment": "one sentence summary"
    }
  ]
}`
          },
          {
            role: "user",
            content: imageContent,
          },
        ],
      }),
    });

    if (!resp.ok) {
      console.error("Visual comparison AI error:", resp.status, await resp.text());
      return results;
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));

    for (const comp of parsed.comparisons || []) {
      if (comp.reference_id) {
        results[comp.reference_id] = {
          similarity: Math.max(0, Math.min(100, comp.visual_similarity ?? 50)),
          redFlags: comp.red_flags || [],
          assessment: comp.assessment || "",
        };
      }
    }
  } catch (e) {
    console.error("Visual comparison failed:", e);
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawInput = await req.json();
    const validationResult = InputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error("Input validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors.map(e => e.message).join(", ")
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { image, backImage, imprint, shape, color, scoring: inputScoring, estimatedSizeMm, hasReferenceObject, photoUrl, backPhotoUrl } = validationResult.data;
    console.log("Input validated successfully");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Derive userId from auth header instead of trusting client-supplied value
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        userId = user?.id ?? null;
      } catch {
        // Anonymous usage is fine — userId stays null
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Step 1: AI feature extraction ──────────────────────────────────────
    console.log("Analyzing pill image with AI...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a pill analysis assistant for harm reduction. Analyze pill images to extract features. You CANNOT detect fentanyl, confirm authenticity, or guarantee safety. This tool helps assess consistency with known reference pills only.

Extract: imprint text (OCR) from the FRONT side, shape, color, scoring/break-line pattern, and thoroughly assess image quality.

If a back-side photo is provided, also extract any text or imprint visible on the BACK of the pill separately as "back_imprint".

For imprint extraction, also rate your confidence in the OCR reading.

For scoring pattern, identify the break lines on the pill:
- "none" = no break line
- "single" = one line across
- "double" = cross/X pattern
- "quad" = four-way split
- "other" = unusual pattern

LOGO DETECTION: Many pills have manufacturer logos stamped on them (e.g., Pfizer shield, Lilly logo, Teva mark, Tesla T, Punisher skull, Superman S). Detect ANY logos or symbols on the pill that are not plain text. Report each logo with a name, confidence level, and description. Set has_logo_only to true if the pill has logos/symbols but NO readable text imprint.

For image quality, be VERY specific about what's wrong and how to fix it. Consider:
- Blur/focus issues
- Lighting problems (too dark, overexposed, shadows)
- Glare/reflections on the pill
- Distance (too far, too close)
- Angle (not perpendicular, partial view)
- Background clutter
- Pill visibility (obscured, multiple pills confusing the view)
- Resolution issues

Respond with JSON only:
{
  "extracted_imprint": "text on front of pill or null if not readable",
  "imprint_confidence": "high|medium|low",
  "back_imprint": "text on back of pill or null if not visible/provided",
  "back_imprint_confidence": "high|medium|low|null",
  "extracted_shape": "round|oval|capsule|diamond|triangle|hexagon|rectangle|other",
  "extracted_color": "white|blue|yellow|pink|green|orange|red|purple|gray|brown|tan|multicolor|other",
  "extracted_scoring": "none|single|double|quad|other",
  "detected_logos": [
    {
      "name": "manufacturer or symbol name e.g. Pfizer, Tesla, Punisher",
      "confidence": "high|medium|low",
      "description": "brief visual description of the logo/symbol"
    }
  ],
  "has_logo_only": false,
  "image_quality": "good|fair|poor",
  "quality_issues": [
    {
      "issue": "short issue name like blur, dark, glare, distance, angle, background, resolution",
      "severity": "minor|moderate|major",
      "description": "Specific description of what's wrong",
      "fix": "Specific actionable advice on how to fix this when retaking the photo"
    }
  ],
  "overall_recommendation": "If quality is fair or poor, provide a single most important recommendation for retaking the photo. Be specific and helpful."
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this pill image. User provided info - Imprint: ${imprint || "not provided"}, Shape: ${shape || "not provided"}, Color: ${color || "not provided"}, Has reference object: ${hasReferenceObject}${backImage ? ". A back-side photo is also provided — use both sides for more accurate imprint extraction and analysis." : ""}` },
              { type: "image_url", image_url: { url: image } },
              ...(backImage ? [{ type: "image_url" as const, image_url: { url: backImage } }] : []),
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    let analysis;
    try {
      const content = aiData.choices?.[0]?.message?.content || "{}";
      analysis = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
      console.log("AI analysis result:", JSON.stringify(analysis));
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysis = { 
        extracted_imprint: null, 
        imprint_confidence: "low",
        back_imprint: null,
        back_imprint_confidence: null,
        extracted_shape: "other", 
        extracted_color: "other", 
        extracted_scoring: null,
        detected_logos: [],
        has_logo_only: false,
        image_quality: "fair",
        quality_issues: [],
        overall_recommendation: null
      };
    }

    const detectedLogos = analysis.detected_logos || [];
    const hasLogoOnly = analysis.has_logo_only || false;

    const finalImprint = imprint || analysis.extracted_imprint;
    const finalBackImprint = analysis.back_imprint || null;
    const finalShape = shape || analysis.extracted_shape;
    const finalColor = color || analysis.extracted_color;
    const imprintConfidence = analysis.imprint_confidence || "low";

    console.log(`Imprints — front: ${finalImprint}, back: ${finalBackImprint}`);

    // ─── Step 2: Text-based reference matching (three-pass with agreement boost) ─
    // Track which passes found each drug name (normalized) for cross-pass agreement
    const drugPassMap: Record<string, Set<number>> = {}; // normalized drug name -> set of pass numbers
    const trackPass = (refs: any[], passNum: number) => {
      for (const r of refs) {
        const key = r.drug_name?.toLowerCase().trim();
        if (key) {
          if (!drugPassMap[key]) drugPassMap[key] = new Set();
          drugPassMap[key].add(passNum);
        }
      }
    };

    // Pass 1: Search by imprint text (front + back)
    let references: any[] = [];
    const existingIdsPass1 = new Set<string>();
    if (finalImprint) {
      const { data: imprintMatches } = await supabase
        .from("pill_reference")
        .select("*")
        .ilike("imprint", `%${finalImprint}%`)
        .limit(20);
      references = imprintMatches || [];
      for (const r of references) existingIdsPass1.add(r.id);
      trackPass(references, 1);
    }

    // Also search by back imprint if it differs from front
    if (finalBackImprint && finalBackImprint !== finalImprint) {
      const { data: backMatches } = await supabase
        .from("pill_reference")
        .select("*")
        .ilike("imprint", `%${finalBackImprint}%`)
        .limit(20);
      if (backMatches) {
        for (const m of backMatches) {
          if (!existingIdsPass1.has(m.id)) {
            references.push(m);
            existingIdsPass1.add(m.id);
          }
        }
        trackPass(backMatches, 1);
      }
      console.log(`Back imprint search added ${(backMatches || []).filter(m => !existingIdsPass1.has(m.id)).length} new results`);
    }

    // Fuzzy fallback: if Pass 1 returned < 3 results, use pg_trgm trigram similarity
    if (references.length < 3 && finalImprint) {
      console.log(`Pass 1 returned ${references.length} results — running fuzzy imprint fallback`);
      const { data: fuzzyMatches } = await supabase.rpc('fuzzy_imprint_search', {
        search_text: finalImprint,
        similarity_threshold: 0.3,
        max_results: 20,
      });
      if (fuzzyMatches) {
        let fuzzyAdded = 0;
        for (const m of fuzzyMatches as any[]) {
          if (!existingIdsPass1.has(m.id)) {
            references.push(m);
            existingIdsPass1.add(m.id);
            fuzzyAdded++;
          }
        }
        trackPass(fuzzyMatches, 1);
        console.log(`Fuzzy front imprint added ${fuzzyAdded} new results`);
      }
    }

    // Fuzzy fallback for back imprint
    if (references.length < 3 && finalBackImprint && finalBackImprint !== finalImprint) {
      const { data: fuzzyBackMatches } = await supabase.rpc('fuzzy_imprint_search', {
        search_text: finalBackImprint,
        similarity_threshold: 0.3,
        max_results: 20,
      });
      if (fuzzyBackMatches) {
        let fuzzyBackAdded = 0;
        for (const m of fuzzyBackMatches as any[]) {
          if (!existingIdsPass1.has(m.id)) {
            references.push(m);
            existingIdsPass1.add(m.id);
            fuzzyBackAdded++;
          }
        }
        trackPass(fuzzyBackMatches, 1);
        console.log(`Fuzzy back imprint added ${fuzzyBackAdded} new results`);
      }
    }

    // Pass 2: If imprint search returned < 3 results, broaden with shape+color fallback
    if (references.length < 3 && finalShape && finalColor) {
      console.log(`Imprint search returned ${references.length} results — running shape+color fallback`);
      const existingIds = new Set(references.map((r: any) => r.id));
      let fallbackQuery = supabase.from("pill_reference").select("*");
      if (finalShape !== "other") fallbackQuery = fallbackQuery.eq("shape", finalShape);
      if (finalColor !== "other") fallbackQuery = fallbackQuery.eq("color", finalColor);
      const { data: fallbackMatches } = await fallbackQuery.limit(20);
      const pass2New: any[] = [];
      if (fallbackMatches) {
        for (const m of fallbackMatches) {
          if (!existingIds.has(m.id)) {
            references.push(m);
            existingIds.add(m.id);
            pass2New.push(m);
          }
        }
      }
      trackPass(fallbackMatches || [], 2);
      console.log(`Total references after shape+color fallback: ${references.length}`);
    }

    // Pass 3: If still < 3 results, try drug name keyword search using AI-extracted context
    if (references.length < 3 && finalImprint) {
      console.log(`Still only ${references.length} results — running drug name keyword fallback`);
      const existingIds = new Set(references.map((r: any) => r.id));
      const keywords = finalImprint
        .replace(/[^a-zA-Z\s]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length >= 2)
        .slice(0, 3);
      
      for (const keyword of keywords) {
        const { data: nameMatches } = await supabase
          .from("pill_reference")
          .select("*")
          .ilike("drug_name", `%${keyword}%`)
          .limit(10);
        if (nameMatches) {
          trackPass(nameMatches, 3);
          for (const m of nameMatches) {
            if (!existingIds.has(m.id)) {
              references.push(m);
              existingIds.add(m.id);
            }
          }
        }
        if (references.length >= 10) break;
      }
      console.log(`Total references after drug name fallback: ${references.length}`);
    }

    // Pass 4: Logo-based search when no text imprint found but logos detected
    if (detectedLogos.length > 0 && references.length < 5) {
      console.log(`Running logo-based search for ${detectedLogos.length} detected logos...`);
      const existingIds = new Set(references.map((r: any) => r.id));
      for (const logo of detectedLogos) {
        const { data: logoMatches } = await supabase
          .from("pill_reference")
          .select("*")
          .ilike("logo_description", `%${logo.name}%`)
          .limit(10);
        if (logoMatches) {
          trackPass(logoMatches, 4);
          for (const m of logoMatches) {
            if (!existingIds.has(m.id)) {
              references.push(m);
              existingIds.add(m.id);
            }
          }
        }
      }
      console.log(`Total references after logo search: ${references.length}`);
    }

    // Log cross-pass agreement
    const CROSS_PASS_BONUS = 15; // bonus points when a drug name appears in 2+ passes
    const agreedDrugs = new Set<string>();
    for (const [drugKey, passes] of Object.entries(drugPassMap)) {
      if (passes.size >= 2) {
        agreedDrugs.add(drugKey);
        console.log(`Cross-pass agreement: "${drugKey}" found in passes ${[...passes].join(", ")}`);
      }
    }

    const finalScoring = inputScoring || analysis.extracted_scoring || null;
    const finalSizeMm = estimatedSizeMm || null;
    const extracted = { imprint: finalImprint, shape: finalShape, color: finalColor, imprintConfidence, scoring: finalScoring, sizeMm: finalSizeMm, detectedLogos };
    
    let scoredMatches = (references || []).map((ref) => {
      const { score, reasons } = calculateMatchScore(
        { imprint: finalImprint, backImprint: finalBackImprint, shape: finalShape, color: finalColor, scoring: finalScoring, sizeMm: finalSizeMm, detectedLogos },
        { imprint: ref.imprint, shape: ref.shape, color: ref.color, scoring: ref.scoring, size_mm: ref.size_mm, logo_description: ref.logo_description }
      );
      let finalScore = score;
      const finalReasons = [...reasons];

      // Apply cross-pass agreement boost
      const drugKey = ref.drug_name?.toLowerCase().trim();
      if (drugKey && agreedDrugs.has(drugKey)) {
        finalScore += CROSS_PASS_BONUS;
        finalReasons.push("Corroborated across multiple search passes");
      }

      return { ...ref, score: finalScore, matchReasons: finalReasons };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => {
      const scoreDelta = b.score - a.score;
      if (scoreDelta !== 0) return scoreDelta;
      const sourceA = SOURCE_PRIORITY[a.source || ""] || 0;
      const sourceB = SOURCE_PRIORITY[b.source || ""] || 0;
      return sourceB - sourceA;
    })
    .slice(0, 5); // Keep top 5 for visual comparison, will trim to 3 after

    // ─── Step 3: Visual comparison with reference images ────────────────────
    const topMatchIds = scoredMatches.map(m => m.id);
    let referenceImages: Record<string, string[]> = {};
    let visualResults: Record<string, { similarity: number; redFlags: string[]; assessment: string }> = {};
    let visualMismatchDetected = false;

    if (topMatchIds.length > 0) {
      const { data: imgRows } = await supabase
        .from("pill_reference_images")
        .select("pill_reference_id, image_url")
        .in("pill_reference_id", topMatchIds);

      if (imgRows && imgRows.length > 0) {
        for (const row of imgRows) {
          if (!referenceImages[row.pill_reference_id]) {
            referenceImages[row.pill_reference_id] = [];
          }
          referenceImages[row.pill_reference_id].push(row.image_url);
        }
        console.log(`Found reference images for ${Object.keys(referenceImages).length} matches`);

        // Run visual comparison for matches that have images
        const matchesWithImages = scoredMatches.filter(m => referenceImages[m.id]?.length > 0).slice(0, 3);
        
        if (matchesWithImages.length > 0) {
          console.log(`Running visual comparison for ${matchesWithImages.length} matches...`);
          visualResults = await runVisualComparison(image, matchesWithImages, referenceImages, lovableKey);
          console.log("Visual comparison results:", JSON.stringify(visualResults));

          // Apply visual similarity scores to matches
          for (const match of scoredMatches) {
            const vr = visualResults[match.id];
            if (vr) {
              // Add visual similarity bonus (0-30 points scaled from 0-100 similarity)
              const visualBonus = Math.round((vr.similarity / 100) * MATCH_WEIGHTS.visualSimilarity);
              match.score += visualBonus;
              match.matchReasons.push(`Visual similarity: ${vr.similarity}%`);

              if (vr.redFlags.length > 0) {
                match.matchReasons.push(`Visual flags: ${vr.redFlags.join(", ")}`);
              }

              // Detect visual mismatch: text match is strong but visual similarity is low
              if (match.score - visualBonus >= CONFIDENCE_THRESHOLDS.medium && vr.similarity < 40) {
                visualMismatchDetected = true;
              }
            }
          }

          // Re-sort after visual scoring
          scoredMatches.sort((a, b) => {
            const scoreDelta = b.score - a.score;
            if (scoreDelta !== 0) return scoreDelta;
            const sourceA = SOURCE_PRIORITY[a.source || ""] || 0;
            const sourceB = SOURCE_PRIORITY[b.source || ""] || 0;
            return sourceB - sourceA;
          });
        }
      } else {
        console.log("No reference images found for top matches");
      }
    }

    // Final top 3
    scoredMatches = scoredMatches.slice(0, 3);

    // ─── Step 3.5: FDA NDC Directory cross-reference verification ───────────
    for (const match of scoredMatches) {
      if (!match.ndc_code) continue;
      try {
        const ndcResp = await fetch(
          `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${match.ndc_code}"&limit=1`
        );
        if (ndcResp.ok) {
          const ndcData = await ndcResp.json();
          const result = ndcData.results?.[0];
          if (result) {
            const fdaColor = (result.active_ingredients?.[0] || result).color?.[0]?.toLowerCase() || "";
            const fdaShape = (result.active_ingredients?.[0] || result).shape?.[0]?.toLowerCase() || "";
            const fdaImprint = (result.packaging?.[0]?.description || "").toLowerCase();

            let verified = true;
            const mismatches: string[] = [];

            if (fdaColor && match.color && !fdaColor.includes(match.color)) {
              verified = false;
              mismatches.push(`color (FDA: ${fdaColor}, ref: ${match.color})`);
            }
            if (fdaShape && match.shape && !fdaShape.includes(match.shape)) {
              verified = false;
              mismatches.push(`shape (FDA: ${fdaShape}, ref: ${match.shape})`);
            }

            if (verified) {
              match.matchReasons.push("✓ Verified against FDA NDC Directory");
            } else {
              match.matchReasons.push(`⚠ Details differ from FDA record: ${mismatches.join(", ")}`);
            }
          }
        } else {
          await ndcResp.text(); // consume body
        }
      } catch (e) {
        console.error(`NDC verification failed for ${match.ndc_code}:`, e);
      }
    }

    // ─── Step 3.75: Regional counterfeit cross-reference ──────────────────
    let counterfeitAlerts: Array<{ drug_name: string; state: string; city: string | null; risk_level: string | null; count: number; latest: string }> = [];
    if (scoredMatches.length > 0) {
      const matchedDrugNames = [...new Set(scoredMatches.map(m => m.drug_name))];
      try {
        // Get recent counterfeit reports (last 90 days) for matched drugs
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const { data: cfReports } = await supabase
          .from("counterfeit_reports")
          .select("drug_name, state, city, risk_level, created_at")
          .gte("created_at", ninetyDaysAgo)
          .in("drug_name", matchedDrugNames)
          .limit(100);

        if (cfReports && cfReports.length > 0) {
          // Group by drug_name + state
          const grouped: Record<string, { drug_name: string; state: string; city: string | null; risk_level: string | null; count: number; latest: string }> = {};
          for (const r of cfReports) {
            const key = `${r.drug_name}|${r.state || "unknown"}`;
            if (!grouped[key]) {
              grouped[key] = {
                drug_name: r.drug_name || "",
                state: r.state || "Unknown",
                city: r.city,
                risk_level: r.risk_level,
                count: 0,
                latest: r.created_at,
              };
            }
            grouped[key].count++;
            if (r.created_at > grouped[key].latest) {
              grouped[key].latest = r.created_at;
              if (r.city) grouped[key].city = r.city;
              if (r.risk_level === "high") grouped[key].risk_level = "high";
            }
          }
          counterfeitAlerts = Object.values(grouped).sort((a, b) => b.count - a.count);
          console.log(`Found ${counterfeitAlerts.length} regional counterfeit alerts for matched drugs`);

          // Add to risk reasons if significant
          const totalCfReports = cfReports.length;
          if (totalCfReports >= 3) {
            riskReasons.push(`⚠ ${totalCfReports} counterfeit reports in the last 90 days for this substance`);
          } else if (totalCfReports > 0) {
            riskReasons.push(`${totalCfReports} counterfeit report(s) found for this substance recently`);
          }
        }
      } catch (e) {
        console.error("Counterfeit cross-reference failed:", e);
      }
    }

    // ─── Step 4: Scoring and risk assessment ────────────────────────────────
    const topMatch = scoredMatches.length > 0 ? scoredMatches[0] : null;
    let matchConfidence: "low" | "medium" | "high" = "low";
    if (topMatch) {
      if (topMatch.score >= CONFIDENCE_THRESHOLDS.high) {
        matchConfidence = "high";
      } else if (topMatch.score >= CONFIDENCE_THRESHOLDS.medium) {
        matchConfidence = "medium";
      }
    }

    // Auto-flag Schedule II substances as high counterfeit risk
    const isScheduleII = scoredMatches.some(m => 
      m.notes?.includes("Schedule II") || m.notes?.includes("CII")
    );

    const { score: anomalyScore, reasons: anomalyReasons } = calculateAnomalyScore(
      extracted,
      topMatch ? { imprint: topMatch.imprint, shape: topMatch.shape, color: topMatch.color, scoring: topMatch.scoring, size_mm: topMatch.size_mm } : null,
      analysis.image_quality,
      visualMismatchDetected,
    );

    const { level: riskLevel, reasons: riskReasons } = deriveRiskLevel(
      matchConfidence,
      anomalyScore,
      analysis.image_quality
    );

    // Elevate risk for Schedule II substances
    if (isScheduleII && riskLevel === "low") {
      riskReasons.push("Matched to a Schedule II controlled substance — higher counterfeit risk");
    }

    console.log(`Match confidence: ${matchConfidence}, Anomaly score: ${anomalyScore}, Risk level: ${riskLevel}, Visual mismatch: ${visualMismatchDetected}, Schedule II: ${isScheduleII}`);

    // ─── Step 5: Persist report and matches ─────────────────────────────────
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        imprint_text: finalImprint,
        shape: finalShape,
        color: finalColor,
        scoring: finalScoring,
        estimated_size_mm: finalSizeMm,
        detected_logos: detectedLogos.length > 0 ? detectedLogos : null,
        image_quality: analysis.image_quality,
        risk_level: riskLevel,
        has_reference_object: hasReferenceObject,
        match_confidence: matchConfidence,
        anomaly_score: anomalyScore,
        anomaly_reasons: anomalyReasons,
        risk_reasons: riskReasons,
        photo_url: photoUrl || null,
        back_photo_url: backPhotoUrl || null,
        user_id: userId || null,
      })
      .select()
      .single();

    if (reportError) throw reportError;

    if (scoredMatches.length > 0) {
      const matchInserts = scoredMatches.map((m, i) => {
        const vr = visualResults[m.id];
        let explanation = m.notes || "";
        if (vr?.assessment) {
          explanation += (explanation ? " • " : "") + `Visual: ${vr.assessment}`;
        }
        if (vr?.redFlags?.length) {
          explanation += ` [Flags: ${vr.redFlags.join(", ")}]`;
        }

        return {
          report_id: report.id,
          rank: i + 1,
          drug_name: m.drug_name,
          matched_imprint: m.imprint,
          matched_shape: m.shape,
          matched_color: m.color,
          confidence: m.score >= CONFIDENCE_THRESHOLDS.high ? "high" : 
                     m.score >= CONFIDENCE_THRESHOLDS.medium ? "medium" : "low",
          explanation,
          match_reasons: m.matchReasons.join("; "),
        };
      });

      await supabase.from("matches").insert(matchInserts);
    }

    console.log("Analysis complete, report:", report.id);

    return new Response(JSON.stringify({ 
      reportId: report.id,
      imageQuality: analysis.image_quality,
      qualityIssues: analysis.quality_issues || [],
      overallRecommendation: analysis.overall_recommendation || null,
      counterfeitAlerts: counterfeitAlerts.length > 0 ? counterfeitAlerts : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
