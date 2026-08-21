// Deletes the calling user's account and all data tied to it.
// Required for App Store Guideline 5.1.1(v) — in-app account deletion.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Tables keyed by user_id. Rows without ON DELETE CASCADE are cleared explicitly
// so no orphaned personal data (pill photos, contacts, history) survives deletion.
const USER_TABLES = [
  "test_strip_results",
  "buddy_alerts",
  "emergency_contacts",
  "webhook_deliveries",
  "webhooks",
  "api_keys",
  "matches",
  "reports",
  "community_submissions",
  "counterfeit_reports",
  "user_roles",
  "profiles",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== "DELETE") return json({ error: "Confirmation required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Remove uploaded pill photos owned by the user (best-effort).
    try {
      const { data: files } = await admin.storage.from("pill-images").list(userId, { limit: 1000 });
      if (files?.length) {
        await admin.storage.from("pill-images").remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch (e) {
      console.warn("storage cleanup skipped:", e);
    }

    // 2. Clear user-keyed rows. Tables that don't exist or lack user_id are skipped.
    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error && !/does not exist|column/.test(error.message)) {
        console.error(`cleanup ${table}:`, error.message);
      }
    }

    // 3. Delete the auth user itself.
    const { error: delError } = await admin.auth.admin.deleteUser(userId);
    if (delError) return json({ error: delError.message }, 500);

    return json({ success: true });
  } catch (e) {
    console.error("delete-account:", e);
    return json({ error: "Failed to delete account" }, 500);
  }
});
