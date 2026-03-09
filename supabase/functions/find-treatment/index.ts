import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zipcode, latitude, longitude } = await req.json();

    if (!zipcode && (!latitude || !longitude)) {
      return new Response(JSON.stringify({ error: "zipcode or latitude/longitude required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use SAMHSA Treatment Locator API
    const sAddr = zipcode || `${latitude},${longitude}`;
    const url = `https://findtreatment.gov/locator/listing?sAddr=${encodeURIComponent(sAddr)}&pageSize=5&sort=0&sType=SA`;

    console.log(`Fetching treatment facilities near: ${sAddr}`);

    const resp = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "PillCheckr-HarmReduction/1.0",
      },
    });

    let facilities: Array<Record<string, unknown>> = [];

    if (resp.ok) {
      try {
        const data = await resp.json();
        const rows = data.rows || data.results || data || [];
        
        facilities = (Array.isArray(rows) ? rows : []).slice(0, 5).map((f: Record<string, unknown>) => ({
          name: f.name1 || f.name || "Treatment Center",
          address: [f.street1 || f.street, f.city, f.state, f.zip].filter(Boolean).join(", "),
          phone: f.phone || null,
          distance: f.miles ? `${Number(f.miles).toFixed(1)} mi` : null,
          website: f.website || null,
          services: (f.services as string[]) || [],
          type: f.type_facility || f.category || null,
        }));
      } catch (parseErr) {
        console.error("Parse error from SAMHSA:", parseErr);
        await resp.text(); // consume body
      }
    } else {
      const errText = await resp.text();
      console.log(`SAMHSA API returned ${resp.status}: ${errText}`);
    }

    // Fallback: also try SAMHSA's alternate API format
    if (facilities.length === 0) {
      try {
        const altUrl = `https://findtreatment.gov/locator/ExportResults?sAddr=${encodeURIComponent(sAddr)}&pageSize=5&sort=0&sType=SA&output=json`;
        const altResp = await fetch(altUrl, {
          headers: { "User-Agent": "PillCheckr-HarmReduction/1.0" },
        });
        if (altResp.ok) {
          const altData = await altResp.json();
          const rows = altData.rows || altData.results || [];
          facilities = (Array.isArray(rows) ? rows : []).slice(0, 5).map((f: Record<string, unknown>) => ({
            name: f.name1 || f.name || "Treatment Center",
            address: [f.street1, f.city, f.state, f.zip].filter(Boolean).join(", "),
            phone: f.phone || null,
            distance: f.miles ? `${Number(f.miles).toFixed(1)} mi` : null,
            website: f.website || null,
            services: [],
            type: f.type_facility || null,
          }));
        } else {
          await altResp.text();
        }
      } catch {
        // Fallback failed, return empty
      }
    }

    // Always include national helpline as last resort
    const helpline = {
      name: "SAMHSA National Helpline",
      address: "Available nationwide",
      phone: "1-800-662-4357",
      distance: null,
      website: "https://findtreatment.gov",
      services: ["24/7 free referral service", "English and Spanish"],
      type: "Helpline",
    };

    return new Response(JSON.stringify({
      facilities,
      helpline,
      search_location: sAddr,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      facilities: [],
      helpline: {
        name: "SAMHSA National Helpline",
        address: "Available nationwide", 
        phone: "1-800-662-4357",
        distance: null,
        website: "https://findtreatment.gov",
        services: ["24/7 free referral service"],
        type: "Helpline",
      },
    }), {
      status: 200, // Return 200 even on error so helpline shows
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
