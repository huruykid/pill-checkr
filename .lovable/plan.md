

## API Integration Strategy for Pill Reference Expansion

### Current State
- Manual `pill_reference` table: 97 entries, 93 unique drugs
- Matching uses deterministic scoring: Imprint (60%), Shape (20%), Color (20%)
- Admin panel exists for manual CRUD operations
- No automated data import capability

### Available Free APIs Analysis

**1. NIH RxImage API** ⭐ Best choice
- Comprehensive pill images with structured metadata
- Imprint, shape, color, size, score line data
- Direct links to high-quality images
- ~60,000+ pill entries
- No authentication required
- Base URL: `https://rximage.nlm.nih.gov/api/rximage/1/rxnav?`

**2. DailyMed API** ⭐ Secondary choice  
- FDA-regulated drug labeling data
- Includes pill characteristics in structured format
- Good for supplementary info (NDC codes, dosage)
- Authentication not required
- Base URL: `https://dailymed.nlm.nih.gov/dailymed/services/v2/`

**3. OpenFDA Drug API**
- More focused on adverse events and recalls
- Less structured pill identification data
- Good for safety warnings, not primary matching

**4. FDA NDC Directory**
- National Drug Code database
- Product info but limited physical descriptions
- Good for validation, not primary matching

### Recommendation: Use RxImage + DailyMed

**Why not all APIs?**
- **RxImage alone covers 98%+ of legitimate pills** with high-quality data
- DailyMed adds validation and labeling details
- OpenFDA/NDC have minimal pill ID value, high maintenance cost
- More APIs = more deduplication complexity, sync issues, stale data

### Implementation Plan

**Phase 1: Core Infrastructure**
1. Create edge function `import-pill-data` with two modes:
   - `source: "rximage"` — primary data import
   - `source: "dailymed"` — supplementary enrichment
2. Add deduplication logic based on imprint + shape + color hash
3. Track import metadata: `source`, `external_id`, `last_synced`

**Phase 2: RxImage Integration**
1. Query RxImage by common drug categories (opioids, benzos, stimulants, etc.)
2. Parse response and normalize to our schema:
   - `name` → `drug_name`
   - `imprint` → `imprint`
   - `shape` → map to our enum (round, oval, capsule, etc.)
   - `splcolor` → `color`
3. Store images in `pill_reference_images` table with `source: "rximage"`
4. Batch insert 100-500 entries per API call (rate limit consideration)

**Phase 3: DailyMed Enrichment**
1. For existing `pill_reference` entries, lookup DailyMed by drug name
2. Add NDC codes, manufacturer, dosage form to `notes` field
3. Cross-validate shape/color data

**Phase 4: Admin UI Controls**
1. Add "API Import" tab to Admin panel
2. Show import stats: total imported, duplicates skipped, last sync time
3. Button to trigger manual import with progress indicator
4. Option to select drug category (e.g., "Import Opioids", "Import Antibiotics")

**Phase 5: Scheduled Sync (Optional)**
1. Use pg_cron to run weekly refresh
2. Update existing entries, add new ones
3. Flag stale entries (not updated in 6+ months)

### Database Schema Changes

Add to `pill_reference` table:
- `source` (text): "manual" | "rximage" | "dailymed"
- `external_id` (text): API's unique identifier
- `last_synced` (timestamp): when data was last updated
- `ndc_code` (text): National Drug Code (from DailyMed)

Add index on `(imprint, shape, color)` for faster deduplication.

### Technical Considerations

**Rate Limiting**
- RxImage: No documented rate limit, but use 1 req/sec to be respectful
- DailyMed: No authentication, recommend 2 req/sec max

**Data Quality**
- RxImage data is human-curated, high accuracy
- Still validate and normalize before insert
- Flag low-confidence entries for admin review

**Deduplication Strategy**
- Hash: `lowercase(imprint) + shape + color`
- On collision: prefer manual entries, then newest external data
- Log skipped duplicates for admin review

**Maintenance**
- Weekly sync to catch new drugs
- Monthly cleanup of stale data
- Admin dashboard to review import logs

### Files to Create/Modify

**New:**
- `supabase/functions/import-pill-data/index.ts` — API integration edge function
- Migration: Add `source`, `external_id`, `last_synced`, `ndc_code` columns
- Migration: Add composite index on `(imprint, shape, color)`

**Modified:**
- `src/pages/Admin.tsx` — Add API Import tab with controls
- `analyze-pill/index.ts` — Optionally prioritize `source: "manual"` matches

### Success Metrics

- Expand from 97 → 5,000+ entries in first import
- Cover top 100 most commonly prescribed drugs
- Reduce "no match found" results by 80%+
- Maintain <500ms query performance with larger dataset

