import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_HOURS = 72; // Re-fetch after 72 hours

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { drug_name } = await req.json();
    if (!drug_name || typeof drug_name !== "string") {
      return new Response(JSON.stringify({ error: "drug_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const { data: cached } = await supabase
      .from("drug_info_cache")
      .select("*")
      .eq("drug_name", drug_name.toLowerCase())
      .maybeSingle();

    if (cached) {
      const cacheAge = (Date.now() - new Date(cached.fetched_at).getTime()) / (1000 * 60 * 60);
      if (cacheAge < CACHE_TTL_HOURS) {
        console.log(`Cache hit for ${drug_name}`);
        return new Response(JSON.stringify({
          drug_name,
          label: cached.label_data,
          adverse_events: cached.adverse_events_data,
          cached: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Fetching openFDA data for: ${drug_name}`);

    // Fetch Drug Label
    let labelData: Record<string, unknown> | null = null;
    try {
      const encodedName = encodeURIComponent(drug_name);
      const labelResp = await fetch(
        `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodedName}"+openfda.generic_name:"${encodedName}"&limit=1`
      );
      if (labelResp.ok) {
        const labelJson = await labelResp.json();
        const result = labelJson.results?.[0];
        if (result) {
          labelData = {
            warnings: result.warnings?.[0] || result.boxed_warning?.[0] || null,
            overdosage: result.overdosage?.[0] || null,
            contraindications: result.contraindications?.[0] || null,
            adverse_reactions: result.adverse_reactions?.[0] || null,
            drug_interactions: result.drug_interactions?.[0] || null,
            brand_name: result.openfda?.brand_name?.[0] || drug_name,
            generic_name: result.openfda?.generic_name?.[0] || null,
            manufacturer: result.openfda?.manufacturer_name?.[0] || null,
            set_id: result.set_id || null,
          };
        }
      } else {
        const text = await labelResp.text();
        console.log(`Label API returned ${labelResp.status}: ${text}`);
      }
    } catch (e) {
      console.error("Label fetch error:", e);
    }

    // Fetch Adverse Events count
    let adverseData: Record<string, unknown> | null = null;
    try {
      const encodedName = encodeURIComponent(drug_name);
      const eventResp = await fetch(
        `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encodedName}"+patient.drug.openfda.generic_name:"${encodedName}"&count=serious`
      );
      if (eventResp.ok) {
        const eventJson = await eventResp.json();
        const counts = eventJson.results || [];
        const totalReports = counts.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
        const seriousCount = counts.find((r: { term: number }) => r.term === 1)?.count || 0;
        adverseData = {
          total_reports: totalReports,
          serious_reports: seriousCount,
          non_serious_reports: totalReports - seriousCount,
        };
      } else {
        const text = await eventResp.text();
        console.log(`Events API returned ${eventResp.status}: ${text}`);
      }
    } catch (e) {
      console.error("Events fetch error:", e);
    }

    // Cache results
    if (labelData || adverseData) {
      const upsertData = {
        drug_name: drug_name.toLowerCase(),
        label_data: labelData,
        adverse_events_data: adverseData,
        fetched_at: new Date().toISOString(),
      };

      if (cached) {
        await supabase
          .from("drug_info_cache")
          .update(upsertData)
          .eq("id", cached.id);
      } else {
        await supabase.from("drug_info_cache").insert(upsertData);
      }
    }

    return new Response(JSON.stringify({
      drug_name,
      label: labelData,
      adverse_events: adverseData,
      cached: false,
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
