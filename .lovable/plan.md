

## Plan: Logo Detection + Populate Size/Scoring Data

### Part 1: Manufacturer Logo Detection

Pills like Pfizer's "VGR 100" have both text and a logo stamp. Many MDMA/ecstasy pills use only logos (e.g., Tesla, Punisher, Superman). Currently the AI prompt only extracts text imprints, missing logo-only pills entirely.

**Changes:**

#### 1a. Update AI extraction prompt (analyze-pill edge function)
Add logo detection to the system prompt so the AI also returns:
- `detected_logos`: array of `{ name: string, confidence: "high"|"medium"|"low", description: string }` — e.g., `[{ name: "Pfizer", confidence: "high", description: "Shield-shaped Pfizer logo" }]`
- `has_logo_only`: boolean — true when the pill has logos but no readable text

#### 1b. Add `logo_description` column to `pill_reference` and `reports`
- `pill_reference.logo_description` (text, nullable) — e.g., "Pfizer shield logo", "Tesla T logo"
- `reports.detected_logos` (jsonb, nullable) — stores the AI-extracted logo array

#### 1c. Update matching logic
- Add a new pass (Pass 4): when no text imprint is found but logos are detected, search `pill_reference.logo_description` using `ilike` with the logo name
- Add logo match weight: +10 points when logo description matches
- Adjust weights: `imprint(40) + shape(12) + color(12) + scoring(8) + size(8) + logo(10) + visual(25) = 115 max`

#### 1d. Update Results page
- Show detected logos in the drug info card when present
- Add "Logo Match" progress bar to the match breakdown

#### 1e. Update visual comparison prompt
- Add logo comparison instructions so the visual AI also checks logo stamp quality, depth, and accuracy against references

---

### Part 2: Populate Size, Thickness, and Scoring Data

The curated dataset in `import-pill-data` has ~400+ entries but none include `size_mm`, `thickness_mm`, or `scoring`. We need to add this data.

**Changes:**

#### 2a. Extend curated dataset entries with physical data
Update the `CURATED_DATA` entries in `import-pill-data/index.ts` to include `size_mm`, `thickness_mm`, and `scoring` fields. Common values sourced from FDA Pill Identifier:
- Most round tablets: 6-10mm diameter, 3-5mm thick
- Capsules: 15-22mm length
- Scoring: most generic tablets have "single", brand ER tablets have "none"

We will add accurate dimensions for the most common/high-risk pills (opioids, benzos, stimulants first — ~80 entries) and reasonable estimates for the rest.

#### 2b. Update import function to write new columns
Modify the insert/upsert logic in `import-pill-data` to include `size_mm`, `thickness_mm`, and `scoring` when inserting or updating references.

#### 2c. Add logo_description to curated data
For pills with known manufacturer logos (Pfizer, Lilly, Teva, etc.), add `logo_description` to the curated entries.

---

### Summary of file changes

| File | Change |
|------|--------|
| Migration SQL | Add `logo_description` to `pill_reference`, `detected_logos` to `reports` |
| `analyze-pill/index.ts` | Update AI prompt for logos, add logo match weight, add Pass 4 logo search |
| `import-pill-data/index.ts` | Add size/thickness/scoring/logo data to curated entries, update upsert logic |
| `src/pages/Results.tsx` | Add Logo Match progress bar, show detected logos |

### Technical notes
- Logo matching uses fuzzy `ilike` on `logo_description` since logo names vary ("Pfizer" vs "pfizer shield")
- Size data sourced from FDA Pill Identifier / DailyMed SPL dimensions where available
- All new columns nullable for backward compatibility
- Re-running the import after deployment will populate existing pills with the new data

