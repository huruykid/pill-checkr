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

    // Build address param for SAMHSA API
    const sAddr = zipcode || `${latitude},${longitude}`;
    
    // Use the correct SAMHSA exportsAsJson/v2 endpoint
    const params = new URLSearchParams({
      sAddr,
      pageSize: "10",
      page: "1",
      sort: "0",
      sType: "SA",
      limitType: "2",       // distance-based
      limitValue: "80467",  // ~50 miles in meters
    });
    
    const url = `https://findtreatment.gov/locator/exportsAsJson/v2?${params.toString()}`;

    console.log(`Fetching treatment facilities from: ${url}`);

    const resp = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "PillCheckr-HarmReduction/1.0",
      },
    });

    let facilities: Array<Record<string, unknown>> = [];

    if (resp.ok) {
      const text = await resp.text();
      try {
        const data = JSON.parse(text);
        const rows = data.rows || data.results || data || [];
        
        facilities = (Array.isArray(rows) ? rows : []).slice(0, 10).map((f: Record<string, unknown>) => {
          // Services come as [{f1: "category", f3: "description"}, ...]
          const rawServices = Array.isArray(f.services) ? f.services : [];
          const serviceLabels = rawServices
            .filter((s: Record<string, string>) => s.f1 && !["Facility Operation (e.g., Private, Public)", "License/Certification/Accreditation", "Payment/Insurance/Funding Accepted", "Payment Assistance Available", "External Opioid Medications Source", " External Source of Medications Used for Alcohol Use Disorder Treatment"].includes(s.f1))
            .map((s: Record<string, string>) => {
              // Use the f3 description but truncate to first item for brevity
              const desc = s.f3 || s.f1;
              return desc.split(";")[0].trim();
            })
            .slice(0, 3);
          
          return {
            name: f.name1 || f.name2 || f.name || "Treatment Center",
            address: [f.street1 || f.street, f.city, f.state, f.zip].filter(Boolean).join(", "),
            phone: f.phone || null,
            distance: f.miles ? `${Number(f.miles).toFixed(1)} mi` : null,
            website: f.website || null,
            services: serviceLabels,
            type: f.type_facility || f.category || null,
            lat: f.latitude ? Number(f.latitude) : null,
            lng: f.longitude ? Number(f.longitude) : null,
          };
        });
      } catch (parseErr) {
        console.error("Parse error from SAMHSA:", parseErr);
        // Log first 500 chars to debug the response format
        console.log("Response preview:", text.substring(0, 500));
      }
    } else {
      const errText = await resp.text();
      console.log(`SAMHSA API returned ${resp.status}: ${errText.substring(0, 300)}`);
    }

    // Fallback: try the non-v2 endpoint
    if (facilities.length === 0) {
      try {
        const altParams = new URLSearchParams({
          sAddr,
          pageSize: "10",
          page: "1",
          sort: "0",
          sType: "SA",
        });
        const altUrl = `https://findtreatment.gov/locator/exportsAsJson?${altParams.toString()}`;
        console.log(`Trying fallback: ${altUrl}`);
        
        const altResp = await fetch(altUrl, {
          headers: { 
            "Accept": "application/json",
            "User-Agent": "PillCheckr-HarmReduction/1.0" 
          },
        });
        
        const altText = await altResp.text();
        
        if (altResp.ok) {
          try {
            const altData = JSON.parse(altText);
            const rows = altData.rows || altData.results || [];
            facilities = (Array.isArray(rows) ? rows : []).slice(0, 10).map((f: Record<string, unknown>) => ({
              name: f.name1 || f.name2 || f.name || "Treatment Center",
              address: [f.street1, f.city, f.state, f.zip].filter(Boolean).join(", "),
              phone: f.phone || null,
              distance: f.miles ? `${Number(f.miles).toFixed(1)} mi` : null,
              website: f.website || null,
              services: [],
              type: f.type_facility || null,
              lat: f.latitude ? Number(f.latitude) : null,
              lng: f.longitude ? Number(f.longitude) : null,
            }));
          } catch {
            console.log("Fallback parse failed, response preview:", altText.substring(0, 500));
          }
        } else {
          console.log(`Fallback returned ${altResp.status}`);
        }
      } catch (e) {
        console.error("Fallback fetch error:", e);
      }
    }

    // Always include national helpline
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
