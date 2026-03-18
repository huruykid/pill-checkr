import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get feedback stats for last 7 days
    const { data: stats, error: statsError } = await supabase.rpc(
      "get_feedback_stats",
      { days_back: 7 }
    );

    if (statsError) {
      throw new Error(`RPC error: ${statsError.message}`);
    }

    const flagged: string[] = [];
    const unflagged: string[] = [];

    for (const row of stats || []) {
      const total = Number(row.helpful_count) + Number(row.unhelpful_count);
      const unhelpfulRatio = total > 0 ? Number(row.unhelpful_count) / total : 0;

      if (total > 10 && unhelpfulRatio > 0.4) {
        // Flag for higher confidence requirement
        const { error } = await supabase
          .from("pill_reference")
          .update({ requires_higher_confidence: true })
          .eq("drug_name", row.drug_name);

        if (!error) {
          flagged.push(row.drug_name);
        }
      } else {
        // Reset flag if ratio improved
        const { error } = await supabase
          .from("pill_reference")
          .update({ requires_higher_confidence: false })
          .eq("drug_name", row.drug_name);

        if (!error) {
          unflagged.push(row.drug_name);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        flagged,
        unflagged,
        totalEvaluated: (stats || []).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
