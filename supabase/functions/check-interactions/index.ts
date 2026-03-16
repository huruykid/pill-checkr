import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function resolveRxCUI(drugName: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`
    );
    if (!resp.ok) { await resp.text(); return null; }
    const data = await resp.json();
    const ids = data.idGroup?.rxnormId;
    return ids?.[0] || null;
  } catch {
    return null;
  }
}

async function getInteractions(rxcuis: string[]): Promise<Array<Record<string, unknown>>> {
  if (rxcuis.length < 2) return [];

  try {
    const resp = await fetch(
      `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join("+")}`
    );
    if (!resp.ok) { await resp.text(); return []; }
    const data = await resp.json();

    const interactions: Array<Record<string, unknown>> = [];
    const pairs = data.fullInteractionTypeGroup || [];

    for (const group of pairs) {
      for (const type of group.fullInteractionType || []) {
        for (const pair of type.interactionPair || []) {
          const concepts = pair.interactionConcept || [];
          const drug1 = concepts[0]?.minConceptItem?.name || "Unknown";
          const drug2 = concepts[1]?.minConceptItem?.name || "Unknown";
          const severity = pair.severity || "N/A";
          const description = pair.description || "No description available";

          interactions.push({
            drug1,
            drug2,
            severity: normalizeSeverity(severity),
            severity_raw: severity,
            description,
          });
        }
      }
    }

    return interactions;
  } catch (e) {
    console.error("Interaction fetch error:", e);
    return [];
  }
}

function normalizeSeverity(raw: string): "minor" | "moderate" | "severe" | "unknown" {
  const lower = raw.toLowerCase();
  if (lower.includes("high") || lower.includes("severe") || lower.includes("serious")) return "severe";
  if (lower.includes("moderate") || lower.includes("significant")) return "moderate";
  if (lower.includes("minor") || lower.includes("low")) return "minor";
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { drug_name, other_drugs } = await req.json();

    if (!drug_name || typeof drug_name !== "string" || drug_name.length > 100) {
      return new Response(JSON.stringify({ error: "drug_name must be a string of 100 characters or less" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(other_drugs) || other_drugs.length === 0) {
      return new Response(JSON.stringify({ error: "other_drugs[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invalidDrug = other_drugs.find(d => typeof d !== "string" || d.length > 100);
    if (invalidDrug !== undefined) {
      return new Response(JSON.stringify({ error: "Each drug name must be a string of 100 characters or less" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (other_drugs.length > 10) {
      return new Response(JSON.stringify({ error: "Maximum 10 drugs allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Checking interactions: ${drug_name} with ${other_drugs.join(", ")}`);

    // Resolve all drug names to RxCUIs in parallel
    const allDrugs = [drug_name, ...other_drugs];
    const rxcuiResults = await Promise.all(allDrugs.map(resolveRxCUI));

    const resolved: Array<{ name: string; rxcui: string | null }> = allDrugs.map((name, i) => ({
      name,
      rxcui: rxcuiResults[i],
    }));

    const unresolved = resolved.filter(r => !r.rxcui).map(r => r.name);
    const validRxcuis = resolved.filter(r => r.rxcui).map(r => r.rxcui!);

    let interactions: Array<Record<string, unknown>> = [];
    if (validRxcuis.length >= 2) {
      interactions = await getInteractions(validRxcuis);
    }

    const hasSevere = interactions.some(i => i.severity === "severe");

    return new Response(JSON.stringify({
      interactions,
      unresolved_drugs: unresolved,
      resolved_count: validRxcuis.length,
      has_severe: hasSevere,
      warning: hasSevere
        ? "⚠️ SEVERE interactions detected. Combining these substances could be life-threatening. Consult a healthcare provider immediately."
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Internal error:", error);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
