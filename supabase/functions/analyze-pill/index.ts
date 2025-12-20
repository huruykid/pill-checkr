import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, imprint, shape, color, hasReferenceObject } = await req.json();

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
            content: `You are a pill analysis assistant for harm reduction. Analyze pill images to extract features. You CANNOT detect fentanyl or guarantee safety. Extract: imprint text (OCR), shape, color, and thoroughly assess image quality.

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
  "extracted_imprint": "text on pill or null",
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

    // Search reference database
    let query = supabase.from("pill_reference").select("*");
    
    if (finalImprint) {
      query = query.ilike("imprint", `%${finalImprint}%`);
    }

    const { data: references } = await query.limit(10);

    // Score and rank matches
    const scoredMatches = (references || []).map((ref) => {
      let score = 0;
      if (finalImprint && ref.imprint.toLowerCase().includes(finalImprint.toLowerCase())) score += 50;
      if (finalShape && ref.shape === finalShape) score += 25;
      if (finalColor && ref.color === finalColor) score += 25;
      return { ...ref, score };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" = "high";
    if (scoredMatches.length > 0 && scoredMatches[0].score >= 75) {
      riskLevel = "low";
    } else if (scoredMatches.length > 0 && scoredMatches[0].score >= 50) {
      riskLevel = "medium";
    }
    if (analysis.image_quality === "poor") riskLevel = "high";

    // Create report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        imprint_text: finalImprint,
        shape: finalShape,
        color: finalColor,
        image_quality: analysis.image_quality,
        risk_level: riskLevel,
        has_reference_object: hasReferenceObject,
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // Insert matches
    if (scoredMatches.length > 0) {
      const matchInserts = scoredMatches.map((m, i) => ({
        report_id: report.id,
        rank: i + 1,
        drug_name: m.drug_name,
        matched_imprint: m.imprint,
        matched_shape: m.shape,
        matched_color: m.color,
        confidence: m.score >= 75 ? "high" : m.score >= 50 ? "medium" : "low",
        explanation: m.notes,
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
