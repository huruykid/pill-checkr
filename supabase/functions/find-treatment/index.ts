import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function geocodeZip(zipcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zipcode)}&country=US&format=json&limit=1`;
    console.log(`Geocoding ZIP ${zipcode} via Nominatim: ${url}`);
    const resp = await fetch(url, {
      headers: { "User-Agent": "PillCheckr-HarmReduction/1.0" },
    });
    if (!resp.ok) {
      console.log(`Nominatim returned ${resp.status}`);
      return null;
    }
    const results = await resp.json();
    if (Array.isArray(results) && results.length > 0) {
      const { lat, lon } = results[0];
      console.log(`Geocoded ZIP ${zipcode} → ${lat}, ${lon}`);
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }
    console.log(`Nominatim returned no results for ZIP ${zipcode}`);
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
}

function parseFacilities(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const skipCategories = new Set([
    "Facility Operation (e.g., Private, Public)",
    "License/Certification/Accreditation",
    "Payment/Insurance/Funding Accepted",
    "Payment Assistance Available",
    "External Opioid Medications Source",
    " External Source of Medications Used for Alcohol Use Disorder Treatment",
    "Pharmacotherapies",
    "Treatment Approaches",
  ]);

  return rows.slice(0, 10).map((f: Record<string, unknown>) => {
    const rawServices = Array.isArray(f.services) ? f.services : [];
    const serviceLabels = rawServices
      .filter((s: Record<string, string>) => s.f1 && !skipCategories.has(s.f1))
      .flatMap((s: Record<string, string>) => {
        const desc = s.f3 || s.f1;
        const label = desc.split(";")[0].trim();
        return label.length > 40 ? [label.substring(0, 37) + "…"] : [label];
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
}

async function fetchSAMHSA(sAddr: string, isCoords: boolean): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    sAddr,
    pageSize: "10",
    page: "1",
    sort: "0",
    sType: "SA",
    ...(isCoords ? { limitType: "2", limitValue: "80467" } : {}),
  });

  // Try v2 endpoint first
  const url = `https://findtreatment.gov/locator/exportsAsJson/v2?${params.toString()}`;
  console.log(`Fetching from: ${url}`);

  const resp = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "PillCheckr-HarmReduction/1.0" },
  });

  if (resp.ok) {
    try {
      const data = JSON.parse(await resp.text());
      const rows = data.rows || data.results || data || [];
      if (Array.isArray(rows) && rows.length > 0) return parseFacilities(rows);
    } catch (e) {
      console.error("Parse error:", e);
    }
  } else {
    console.log(`SAMHSA v2 returned ${resp.status}`);
  }

  // Fallback to non-v2
  const altParams = new URLSearchParams({ sAddr, pageSize: "10", page: "1", sort: "0", sType: "SA" });
  const altUrl = `https://findtreatment.gov/locator/exportsAsJson?${altParams.toString()}`;
  console.log(`Trying fallback: ${altUrl}`);

  const altResp = await fetch(altUrl, {
    headers: { "Accept": "application/json", "User-Agent": "PillCheckr-HarmReduction/1.0" },
  });

  if (altResp.ok) {
    try {
      const altData = JSON.parse(await altResp.text());
      const rows = altData.rows || altData.results || [];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.slice(0, 10).map((f: Record<string, unknown>) => ({
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
      }
    } catch {
      console.log("Fallback parse failed");
    }
  }

  return [];
}

const HELPLINE = {
  name: "SAMHSA National Helpline",
  address: "Available nationwide",
  phone: "1-800-662-4357",
  distance: null,
  website: "https://findtreatment.gov",
  services: ["24/7 free referral service", "English and Spanish"],
  type: "Helpline",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { zipcode, latitude, longitude } = await req.json();

    if (zipcode && (typeof zipcode !== "string" || !/^\d{5}(-\d{4})?$/.test(zipcode))) {
      return new Response(JSON.stringify({ error: "Invalid zipcode format." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (latitude !== undefined && (typeof latitude !== "number" || latitude < -90 || latitude > 90)) {
      return new Response(JSON.stringify({ error: "Invalid latitude" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (longitude !== undefined && (typeof longitude !== "number" || longitude < -180 || longitude > 180)) {
      return new Response(JSON.stringify({ error: "Invalid longitude" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!zipcode && (!latitude || !longitude)) {
      return new Response(JSON.stringify({ error: "zipcode or latitude/longitude required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let searchCoordinates: { lat: number; lng: number } | null = null;
    let sAddr: string;

    if (zipcode) {
      // Geocode the ZIP to get accurate coordinates
      const geo = await geocodeZip(zipcode);
      if (geo) {
        searchCoordinates = geo;
        sAddr = `${geo.lat},${geo.lng}`;
      } else {
        // Fall back to raw ZIP if geocoding fails
        sAddr = zipcode;
      }
    } else {
      searchCoordinates = { lat: latitude!, lng: longitude! };
      sAddr = `${latitude},${longitude}`;
    }

    const facilities = await fetchSAMHSA(sAddr, !!searchCoordinates);

    return new Response(JSON.stringify({
      facilities,
      helpline: HELPLINE,
      search_location: sAddr,
      search_coordinates: searchCoordinates,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      facilities: [],
      helpline: HELPLINE,
      search_coordinates: null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
