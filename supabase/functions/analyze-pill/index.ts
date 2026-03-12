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
  hasReferenceObject: z.boolean().default(false),
  photoUrl: z.string().optional().nullable(),
  backPhotoUrl: z.string().optional().nullable(),
});

// Match scoring weights
const MATCH_WEIGHTS = {
  imprintExact: 50,
  imprintPartial: 25,
  shape: 15,
  color: 15,
  visualSimilarity: 30, // max bonus from visual comparison
};

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
  extracted: { imprint: string | null; shape: string | null; color: string | null },
  reference: { imprint: string; shape: string; color: string }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (extracted.imprint && reference.imprint) {
    const extractedNorm = extracted.imprint.toLowerCase().replace(/\s+/g, "");
    const refNorm = reference.imprint.toLowerCase().replace(/\s+/g, "");
    
    if (extractedNorm === refNorm) {
      score += MATCH_WEIGHTS.imprintExact;
      reasons.push("Imprint matches exactly");
    } else if (refNorm.includes(extractedNorm) || extractedNorm.includes(refNorm)) {
      score += MATCH_WEIGHTS.imprintPartial;
      reasons.push("Imprint partially matches");
    }
  }

  if (extracted.shape && reference.shape && extracted.shape === reference.shape) {
    score += MATCH_WEIGHTS.shape;
    reasons.push("Shape matches");
  }

  if (extracted.color && reference.color && extracted.color === reference.color) {
    score += MATCH_WEIGHTS.color;
    reasons.push("Color matches");
  }

  return { score, reasons };
}

// Calculate anomaly score based on inconsistencies
function calculateAnomalyScore(
  extracted: { imprint: string | null; shape: string | null; color: string | null; imprintConfidence: string },
  topMatch: { imprint: string; shape: string; color: string } | null,
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
    score += 15;
    reasons.push("Color doesn't match typical reference for this pill");
  }

  // Visual mismatch is a strong counterfeit signal
  if (visualMismatch) {
    score += 25;
    reasons.push("Visual appearance differs significantly from legitimate reference images — possible counterfeit indicator");
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
    
    const { image, backImage, imprint, shape, color, hasReferenceObject, photoUrl, backPhotoUrl } = validationResult.data;
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

Extract: imprint text (OCR), shape, color, and thoroughly assess image quality.

For imprint extraction, also rate your confidence in the OCR reading.

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
  "extracted_imprint": "text on pill or null if not readable",
  "imprint_confidence": "high|medium|low",
  "extracted_shape": "round|oval|capsule|diamond|triangle|hexagon|rectangle|other",
  "extracted_color": "white|blue|yellow|pink|green|orange|red|purple|gray|brown|tan|multicolor|other",
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
        extracted_shape: "other", 
        extracted_color: "other", 
        image_quality: "fair",
        quality_issues: [],
        overall_recommendation: null
      };
    }

    const finalImprint = imprint || analysis.extracted_imprint;
    const finalShape = shape || analysis.extracted_shape;
    const finalColor = color || analysis.extracted_color;
    const imprintConfidence = analysis.imprint_confidence || "low";

    // ─── Step 2: Text-based reference matching ──────────────────────────────
    let query = supabase.from("pill_reference").select("*");
    if (finalImprint) {
      query = query.ilike("imprint", `%${finalImprint}%`);
    }

    const { data: references } = await query.limit(20);

    const extracted = { imprint: finalImprint, shape: finalShape, color: finalColor, imprintConfidence };
    
    let scoredMatches = (references || []).map((ref) => {
      const { score, reasons } = calculateMatchScore(
        { imprint: finalImprint, shape: finalShape, color: finalColor },
        { imprint: ref.imprint, shape: ref.shape, color: ref.color }
      );
      return { ...ref, score, matchReasons: reasons };
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
      topMatch ? { imprint: topMatch.imprint, shape: topMatch.shape, color: topMatch.color } : null,
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
        image_quality: analysis.image_quality,
        risk_level: riskLevel,
        has_reference_object: hasReferenceObject,
        match_confidence: matchConfidence,
        anomaly_score: anomalyScore,
        anomaly_reasons: anomalyReasons,
        risk_reasons: riskReasons,
        photo_url: photoUrl || null,
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
      overallRecommendation: analysis.overall_recommendation || null
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
