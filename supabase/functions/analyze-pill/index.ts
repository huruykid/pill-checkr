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
  imprint: z.string().max(50, "Imprint must be 50 characters or less").optional().nullable(),
  shape: z.enum(['round', 'oval', 'capsule', 'diamond', 'triangle', 'hexagon', 'rectangle', 'other']).optional().nullable(),
  color: z.enum(['white', 'blue', 'yellow', 'pink', 'green', 'orange', 'red', 'purple', 'gray', 'brown', 'tan', 'multicolor', 'other']).optional().nullable(),
  hasReferenceObject: z.boolean().default(false),
  photoUrl: z.string().url().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
});

// Match scoring weights
const MATCH_WEIGHTS = {
  imprintExact: 60,
  imprintPartial: 30,
  shape: 20,
  color: 20,
};

// Thresholds for confidence levels
const CONFIDENCE_THRESHOLDS = {
  high: 80,
  medium: 50,
};

// Calculate match score between extracted features and reference pill
function calculateMatchScore(
  extracted: { imprint: string | null; shape: string | null; color: string | null },
  reference: { imprint: string; shape: string; color: string }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Imprint matching (most important)
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

  // Shape matching
  if (extracted.shape && reference.shape && extracted.shape === reference.shape) {
    score += MATCH_WEIGHTS.shape;
    reasons.push("Shape matches");
  }

  // Color matching
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
  imageQuality: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // OCR/imprint issues
  if (!extracted.imprint) {
    score += 25;
    reasons.push("Imprint could not be read or detected");
  } else if (extracted.imprintConfidence === "low") {
    score += 15;
    reasons.push("Imprint text recognition was uncertain");
  }

  // Image quality issues
  if (imageQuality === "poor") {
    score += 30;
    reasons.push("Image quality is poor, affecting analysis accuracy");
  } else if (imageQuality === "fair") {
    score += 10;
    reasons.push("Image quality is fair, some details may be unclear");
  }

  // Inconsistencies with top match
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

  // No matches at all
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
  
  // Start with baseline from match confidence
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

  // Add anomaly contribution
  if (anomalyScore >= 50) {
    riskPoints += 40;
    reasons.push("High inconsistency detected between pill features");
  } else if (anomalyScore >= 25) {
    riskPoints += 20;
    reasons.push("Some inconsistencies noted in pill features");
  }

  // Image quality impact
  if (imageQuality === "poor") {
    riskPoints += 20;
    reasons.push("Poor image quality limits analysis accuracy");
  }

  // Determine final risk level
  let level: "low" | "medium" | "high" = "low";
  if (riskPoints >= 50) {
    level = "high";
  } else if (riskPoints >= 25) {
    level = "medium";
  }

  return { level, reasons };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const rawInput = await req.json();
    const validationResult = InputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error("Input validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors.map(e => e.message).join(", ")
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { image, imprint, shape, color, hasReferenceObject, photoUrl, userId } = validationResult.data;
    console.log("Input validated successfully");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Analyze image with AI
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
              { type: "text", text: `Analyze this pill image. User provided info - Imprint: ${imprint || "not provided"}, Shape: ${shape || "not provided"}, Color: ${color || "not provided"}, Has reference object: ${hasReferenceObject}` },
              { type: "image_url", image_url: { url: image } }
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

    // Search reference database
    let query = supabase.from("pill_reference").select("*");
    
    // Broader search to get more candidates for scoring
    if (finalImprint) {
      query = query.ilike("imprint", `%${finalImprint}%`);
    }

    const { data: references } = await query.limit(20);

    // Score and rank matches using deterministic algorithm
    const extracted = { imprint: finalImprint, shape: finalShape, color: finalColor, imprintConfidence };
    
    const scoredMatches = (references || []).map((ref) => {
      const { score, reasons } = calculateMatchScore(
        { imprint: finalImprint, shape: finalShape, color: finalColor },
        { imprint: ref.imprint, shape: ref.shape, color: ref.color }
      );
      return { ...ref, score, matchReasons: reasons };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

    // Determine match confidence from top match
    const topMatch = scoredMatches.length > 0 ? scoredMatches[0] : null;
    let matchConfidence: "low" | "medium" | "high" = "low";
    if (topMatch) {
      if (topMatch.score >= CONFIDENCE_THRESHOLDS.high) {
        matchConfidence = "high";
      } else if (topMatch.score >= CONFIDENCE_THRESHOLDS.medium) {
        matchConfidence = "medium";
      }
    }

    // Calculate anomaly score
    const { score: anomalyScore, reasons: anomalyReasons } = calculateAnomalyScore(
      extracted,
      topMatch ? { imprint: topMatch.imprint, shape: topMatch.shape, color: topMatch.color } : null,
      analysis.image_quality
    );

    // Derive risk level
    const { level: riskLevel, reasons: riskReasons } = deriveRiskLevel(
      matchConfidence,
      anomalyScore,
      analysis.image_quality
    );

    console.log(`Match confidence: ${matchConfidence}, Anomaly score: ${anomalyScore}, Risk level: ${riskLevel}`);

    // Create report with new fields
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

    // Insert matches with match_reasons
    if (scoredMatches.length > 0) {
      const matchInserts = scoredMatches.map((m, i) => ({
        report_id: report.id,
        rank: i + 1,
        drug_name: m.drug_name,
        matched_imprint: m.imprint,
        matched_shape: m.shape,
        matched_color: m.color,
        confidence: m.score >= CONFIDENCE_THRESHOLDS.high ? "high" : 
                   m.score >= CONFIDENCE_THRESHOLDS.medium ? "medium" : "low",
        explanation: m.notes,
        match_reasons: m.matchReasons.join("; "),
      }));

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
