// Deletes anonymous pill photos (pill-images/anon/) older than 30 days.
// The privacy policy promises anonymous photos are not retained long-term;
// this job is what makes that promise true. Invoked nightly by pg_cron
// (see migration 20260830120100_schedule_anon_image_purge.sql).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RETENTION_DAYS = 30;
const BUCKET = "pill-images";
const FOLDER = "anon";
const PAGE_SIZE = 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const expired: string[] = [];
    let offset = 0;

    while (true) {
      const { data: files, error } = await admin.storage
        .from(BUCKET)
        .list(FOLDER, { limit: PAGE_SIZE, offset, sortBy: { column: "created_at", order: "asc" } });
      if (error) throw error;
      if (!files?.length) break;

      for (const f of files) {
        if (f.created_at && new Date(f.created_at).getTime() < cutoff) {
          expired.push(`${FOLDER}/${f.name}`);
        }
      }
      // Oldest-first listing: once a page has nothing expired, later pages won't either.
      if (files.length < PAGE_SIZE || !files.some((f) => f.created_at && new Date(f.created_at).getTime() < cutoff)) {
        break;
      }
      offset += PAGE_SIZE;
    }

    let deleted = 0;
    for (let i = 0; i < expired.length; i += 100) {
      const batch = expired.slice(i, i + 100);
      const { error } = await admin.storage.from(BUCKET).remove(batch);
      if (error) throw error;
      deleted += batch.length;
    }

    console.log(`purge-anon-images: deleted ${deleted} of ${expired.length} expired objects`);
    return json({ deleted, retention_days: RETENTION_DAYS });
  } catch (e) {
    console.error("purge-anon-images failed:", e);
    return json({ error: (e as Error).message ?? "purge failed" }, 500);
  }
});
