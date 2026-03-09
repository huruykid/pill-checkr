

# Full API Integration Plan — Ultimate Harm Reduction Product

This plan adds four major API integrations across three phases. All APIs are free, public, and government-maintained — no API keys needed.

---

## Phase 1: openFDA Integration (Results Page Enrichment)

### What
When a pill is identified, fetch official drug warnings, adverse events, and overdose info from openFDA and display them on the Results page.

### Edge Function: `enrich-drug-info`
- Accepts `drug_name` from the client
- Calls two openFDA endpoints (no API key required):
  - **Drug Label API**: `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"DRUG"` → extracts `warnings`, `overdosage`, `contraindications`, `adverse_reactions`
  - **Adverse Events API**: `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"DRUG"&count=serious` → returns count of serious adverse event reports
- Returns structured JSON with warnings, overdose symptoms, and event counts
- Caches results in a new `drug_info_cache` table (drug_name, data, fetched_at) to avoid redundant calls

### Database
- New table: `drug_info_cache` (id, drug_name unique, label_data jsonb, adverse_events_data jsonb, fetched_at timestamptz, created_at timestamptz)
- RLS: publicly readable (SELECT), no INSERT/UPDATE/DELETE from client — edge function uses service role

### Results Page Changes
- After loading matches, call `enrich-drug-info` for the top match's drug_name
- New card: **"Official Drug Information"** showing:
  - Warnings section (collapsible)
  - Overdose symptoms & emergency guidance
  - Known adverse reactions count badge
  - Link to full FDA label

---

## Phase 2: SAMHSA Treatment Locator (Find Help Nearby)

### What
Add a "Find Help Near You" feature using the SAMHSA Treatment Locator API to show nearby treatment centers, naloxone distribution, and harm reduction services.

### Edge Function: `find-treatment`
- Accepts `latitude`, `longitude` (or `zipcode`)
- Calls SAMHSA API: `https://findtreatment.gov/locator/listing?sAddr=ZIP&pageSize=5` (free, no key)
- Returns list of nearby facilities with name, address, phone, distance, services offered

### UI Changes
- New component: `NearbyHelp.tsx` — shows on Results page (after HarmReductionResources) and on Education page
- Uses browser geolocation API (with user permission) or ZIP code input fallback
- Displays facility cards with: name, distance, phone (click-to-call), services tags
- Loading/error/permission-denied states

---

## Phase 3: RxNorm Drug Interaction Checker

### What
Add a drug interaction checker where users can enter other medications they take and get warned about dangerous combinations.

### Edge Function: `check-interactions`
- Accepts `drug_name` (the matched pill) and `other_drugs` (array of user-entered drug names)
- Step 1: Resolve each drug name to RxCUI via `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=DRUG`
- Step 2: Check interactions via `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=CUI1+CUI2`
- Returns interaction pairs with severity and description

### UI Changes
- New component: `InteractionChecker.tsx` on Results page (below matches)
- Input field to add other medications (tag-style multi-input)
- "Check Interactions" button
- Results show interaction cards with severity badges (minor/moderate/severe) and descriptions
- Warning banner for severe interactions

---

## Phase 4: FDA NDC Directory Enrichment (Analyze Pipeline)

### What
Enhance the analyze-pill edge function to cross-reference matched pills against the FDA NDC Directory for additional verification.

### Changes to `analyze-pill/index.ts`
- After text-based matching, for the top 3 matches that have `ndc_code`:
  - Call `https://api.fda.gov/drug/ndc.json?search=product_ndc:"NDC"` 
  - Verify the pill's shape, color, and imprint match the FDA record
  - Add verification status to match explanation: "✓ Verified against FDA NDC Directory" or "⚠ Details differ from FDA record"
- This adds a second layer of verification to the existing matching pipeline

---

## Summary of New Files

```text
supabase/functions/enrich-drug-info/index.ts    (Phase 1)
supabase/functions/find-treatment/index.ts       (Phase 2)
supabase/functions/check-interactions/index.ts   (Phase 3)
src/components/results/DrugInfoCard.tsx          (Phase 1)
src/components/shared/NearbyHelp.tsx             (Phase 2)
src/components/results/InteractionChecker.tsx    (Phase 3)
```

## Modified Files

```text
src/pages/Results.tsx          — add DrugInfoCard, InteractionChecker, NearbyHelp
src/pages/Education.tsx        — add NearbyHelp
supabase/config.toml           — register 3 new edge functions
supabase/functions/analyze-pill/index.ts — add NDC verification (Phase 4)
```

## Database Migration

```text
New table: drug_info_cache
  - id uuid PK
  - drug_name text UNIQUE
  - label_data jsonb
  - adverse_events_data jsonb
  - fetched_at timestamptz
  - created_at timestamptz DEFAULT now()
RLS: public SELECT only
```

All four APIs are free and require no API keys. Implementation order follows the phases above.

