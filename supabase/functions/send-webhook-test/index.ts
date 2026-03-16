import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { webhookId } = await req.json();

    if (!webhookId) {
      return new Response(JSON.stringify({ error: "webhookId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read/write deliveries
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify webhook belongs to user
    const { data: webhook, error: whErr } = await admin
      .from("webhooks")
      .select("*")
      .eq("id", webhookId)
      .eq("user_id", userId)
      .single();

    if (whErr || !webhook) {
      return new Response(JSON.stringify({ error: "Webhook not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate webhook URL to prevent SSRF
    const parsed = new URL(webhook.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: "Invalid webhook URL protocol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hostname = parsed.hostname.toLowerCase();
    const privatePatterns = [
      /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
      /^169\.254\./, /^0\./, /^localhost$/i, /^metadata\.google\.internal$/i,
      /^\[::1\]$/, /^\[fc/, /^\[fd/, /^\[fe80/,
    ];
    if (privatePatterns.some(re => re.test(hostname))) {
      return new Response(JSON.stringify({ error: "Webhook URLs pointing to private/internal networks are not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send test payload
    const testPayload = {
      event: "high_risk_analysis",
      test: true,
      timestamp: new Date().toISOString(),
      data: {
        report_id: "test-00000000-0000-0000-0000-000000000000",
        risk_level: "high",
        imprint_text: "M30",
        shape: "round",
        color: "blue",
        anomaly_score: 72,
        top_match: "Oxycodone 30mg (suspected counterfeit)",
        match_confidence: "low",
      },
    };

    let statusCode = 0;
    let responseBody = "";
    let success = false;

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });
      statusCode = res.status;
      responseBody = (await res.text()).substring(0, 1000);
      success = res.ok;
    } catch (fetchErr) {
      responseBody = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
    }

    // Record delivery
    await admin.from("webhook_deliveries").insert({
      webhook_id: webhookId,
      event_type: "high_risk_analysis (test)",
      payload: testPayload,
      status_code: statusCode || null,
      response_body: responseBody,
      success,
    });

    return new Response(
      JSON.stringify({ success, status_code: statusCode }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending test webhook:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send test webhook" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
