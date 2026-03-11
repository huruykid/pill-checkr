import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_HOURS = 72;

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
    if (drug_name.length > 200) {
      return new Response(JSON.stringify({ error: "drug_name must be 200 characters or less" }), {
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
          // Extract DEA schedule from openfda
          const deaSchedule = result.openfda?.product_type?.[0]?.includes("HUMAN PRESCRIPTION")
            ? result.openfda?.dea_schedule || null
            : null;

          labelData = {
            warnings: result.warnings?.[0] || result.boxed_warning?.[0] || null,
            overdosage: result.overdosage?.[0] || null,
            contraindications: result.contraindications?.[0] || null,
            adverse_reactions: result.adverse_reactions?.[0] || null,
            drug_interactions: result.drug_interactions?.[0] || null,
            dosage_and_administration: result.dosage_and_administration?.[0] || null,
            brand_name: result.openfda?.brand_name?.[0] || drug_name,
            generic_name: result.openfda?.generic_name?.[0] || null,
            manufacturer: result.openfda?.manufacturer_name?.[0] || null,
            set_id: result.set_id || null,
            dea_schedule: deaSchedule,
            substance_name: result.openfda?.substance_name?.[0] || null,
            product_type: result.openfda?.product_type?.[0] || null,
            route: result.openfda?.route?.[0] || null,
          };
        }
      } else {
        const text = await labelResp.text();
        console.log(`Label API returned ${labelResp.status}: ${text}`);
      }
    } catch (e) {
      console.error("Label fetch error:", e);
    }

    // Try RxNorm for DEA schedule if not found in label
    if (labelData && !labelData.dea_schedule) {
      try {
        const rxResp = await fetch(
          `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drug_name)}&search=2`
        );
        if (rxResp.ok) {
          const rxData = await rxResp.json();
          const rxcui = rxData.idGroup?.rxnormId?.[0];
          if (rxcui) {
            // Check DEA schedule via RxClass
            const classResp = await fetch(
              `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=ATC`
            );
            if (classResp.ok) {
              const classData = await classResp.json();
              // Look for schedule info in the response
              const concepts = classData.rxclassDrugInfoList?.rxclassDrugInfo || [];
              for (const c of concepts) {
                const className = (c.rxclassMinConceptItem?.className || "").toUpperCase();
                if (className.includes("SCHEDULE II") || className.includes("CII")) {
                  labelData.dea_schedule = "CII";
                  break;
                } else if (className.includes("SCHEDULE III") || className.includes("CIII")) {
                  labelData.dea_schedule = "CIII";
                  break;
                } else if (className.includes("SCHEDULE IV") || className.includes("CIV")) {
                  labelData.dea_schedule = "CIV";
                  break;
                } else if (className.includes("SCHEDULE V") || className.includes("CV")) {
                  labelData.dea_schedule = "CV";
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("RxNorm schedule lookup error:", e);
      }
    }

    // Fetch Adverse Events with outcome breakdown
    let adverseData: Record<string, unknown> | null = null;
    try {
      const encodedName = encodeURIComponent(drug_name);

      // Get total serious vs non-serious
      const eventResp = await fetch(
        `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encodedName}"+patient.drug.openfda.generic_name:"${encodedName}"&count=serious`
      );

      // Get outcome breakdown (deaths, hospitalizations, etc.)
      const outcomeResp = await fetch(
        `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encodedName}"+patient.drug.openfda.generic_name:"${encodedName}"&count=patient.reaction.reactionoutcome`
      );

      let totalReports = 0;
      let seriousCount = 0;

      if (eventResp.ok) {
        const eventJson = await eventResp.json();
        const counts = eventJson.results || [];
        totalReports = counts.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
        seriousCount = counts.find((r: { term: number }) => r.term === 1)?.count || 0;
      } else {
        await eventResp.text();
      }

      // Outcome codes: 1=Recovered, 2=Recovering, 3=Not recovered, 4=Recovered with sequelae, 5=Fatal, 6=Unknown
      let deaths = 0;
      let hospitalizations = 0;
      let erVisits = 0;

      if (outcomeResp.ok) {
        const outcomeJson = await outcomeResp.json();
        const outcomes = outcomeJson.results || [];
        deaths = outcomes.find((r: { term: number }) => r.term === 5)?.count || 0;
      } else {
        await outcomeResp.text();
      }

      // Get hospitalization count
      try {
        const hospResp = await fetch(
          `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encodedName}"+patient.drug.openfda.generic_name:"${encodedName}"+seriousnesshospitalization:1&limit=1`
        );
        if (hospResp.ok) {
          const hospJson = await hospResp.json();
          hospitalizations = hospJson.meta?.results?.total || 0;
        } else {
          await hospResp.text();
        }
      } catch { /* ignore */ }

      // Get ER visit count
      try {
        const erResp = await fetch(
          `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encodedName}"+patient.drug.openfda.generic_name:"${encodedName}"+seriousnessother:1&limit=1`
        );
        if (erResp.ok) {
          const erJson = await erResp.json();
          erVisits = erJson.meta?.results?.total || 0;
        } else {
          await erResp.text();
        }
      } catch { /* ignore */ }

      if (totalReports > 0 || deaths > 0) {
        adverseData = {
          total_reports: totalReports,
          serious_reports: seriousCount,
          non_serious_reports: totalReports - seriousCount,
          deaths,
          hospitalizations,
          er_visits: erVisits,
        };
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
