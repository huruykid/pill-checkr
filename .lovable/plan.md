## Plan: Automated DailyMed Reference Pipeline

### Important Discovery

The RxImage API was **officially discontinued in December 2021**. The image CDN URLs may still resolve for cached entries (and the existing `fetchRxImageUrl` already handles this gracefully with fallback), but the bulk listing endpoint is gone.

The replacement is the **DailyMed v2 API**, which is actively maintained by NLM and provides pill identification data (imprint, shape, color, size, score) via the `/ndc/{ndc}/imprintdata` endpoint.

### Architecture

```text
Weekly cron (Wed 2AM UTC)
        │
        ▼
[sync-rximage-data edge function]
        │
        ├── Step 1: Fetch NDC list from DailyMed v2
        │   GET /services/v2/drugnames.json?drug_name=oxycodone&pagesize=100
        │   → get setids → GET /spls/{setid}/ndcs → collect NDC codes
        │
        ├── Step 2: For each NDC, fetch imprint data
        │   GET /ndc/{ndc}/imprintdata.json
        │   → returns: name, splimprint, splshape, splcolor, splsize, splscore
        │
        ├── Step 3: Map DailyMed fields → pill_reference schema
        │   Normalize shape/color enums, parse size_mm
        │
        ├── Step 4: Upsert into pill_reference
        │   Dedupe on imprint+shape+color key (existing pattern)
        │
        ├── Step 5: Attempt RxImage CDN fetch for reference images
        │   (graceful fallback if CDN is down)
        │
        └── Return summary JSON
```

### Changes

**1. New file: `supabase/functions/sync-rximage-data/index.ts**`

- Uses service role key (no auth required — called by cron)
- Accepts optional body params: `{ drugNames?: string[], rLimit?: number }` with sensible defaults
- Default drug list: high-priority counterfeited medications (oxycodone, alprazolam, adderall, hydrocodone, etc. — ~15 names)
- For each drug name:
  - Calls DailyMed v2 `/services/v2/spls.json?drug_name=X&pagesize=100` to get setids
  - For each setid, calls `/spls/{setid}/ndcs.json` to get NDC codes
  - For each NDC, calls v1 `/ndc/{ndc}/imprintdata.json` to get pill details
  - Maps DailyMed fields to our schema (SPLSHAPE→pill_shape, SPLCOLOR→pill_color, etc.)
  - Deduplicates using the existing `imprint+shape+color` key pattern
  - Upserts into `pill_reference` with `source: 'dailymed'`
  - Attempts RxImage CDN image fetch per NDC (existing pattern, graceful failure)
  - Stores images in `pill_reference_images`
- Returns JSON: `{ inserted, updated, skipped, imagesAdded, apiErrors, drugNames }`
- Timeout-safe: caps total processing at `rLimit` (default 50) records per run
- All DailyMed API calls have 10s timeout with try/catch

**2. Update `supabase/config.toml**`

Add:

```toml
[functions.sync-rximage-data]
verify_jwt = false
```

**3. SQL insert (not migration) for pg_cron schedule**

Schedule the function to run every Wednesday at 2:00 AM UTC using pg_net, matching the existing cron pattern for tune-confidence-scores.

### Field Mapping


| DailyMed Field          | pill_reference Column                         |
| ----------------------- | --------------------------------------------- |
| NAME                    | drug_name                                     |
| SPLIMPRINT              | imprint                                       |
| SPLSHAPE (e.g. "ROUND") | shape (lowercase enum)                        |
| SPLCOLOR (e.g. "BLUE")  | color (lowercase enum)                        |
| SPLSIZE (e.g. "13 mm")  | size_mm (parse numeric)                       |
| SPLSCORE (e.g. 1, 2)    | scoring (map: 1→"none", 2→"single", 4→"quad") |
| PRODUCT_CODE            | ndc_code                                      |


### Files Changed


| File                                            | Action                            |
| ----------------------------------------------- | --------------------------------- |
| `supabase/functions/sync-rximage-data/index.ts` | New edge function                 |
| `supabase/config.toml`                          | Add function config               |
| pg_cron via insert tool                         | Schedule weekly Wednesday 2AM UTC |


### Scope

- 1 new edge function (~200 lines)
- 1 config update
- 1 cron schedule (insert, not migration)
- No frontend changes
- No schema changes needed  
  
  
One minor thing to keep an eye on:
  Because the DailyMed API requires a "waterfall" of requests (Search Drug -> Get SetID -> Get NDCs -> Get Imprint Data), it takes multiple network calls just to process one pill.
  - Lovable smartly added an `rLimit` (default 50) to prevent the edge function from timing out.
  - **Tip:** If you see the cron job failing in your Supabase logs next week, it likely means the edge function is timing out before it finishes the 50 items. You can simply lower the `rLimit` to 25 or 20 so it processes smaller chunks every Wednesday.