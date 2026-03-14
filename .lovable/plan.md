

## Plan: Add MDMA/Ecstasy Logo Pills to Reference Database

### What
Add a new `"mdma_ecstasy"` category to the curated dataset containing common logo-only pressed pills (Tesla, Punisher, Superman, Philipp Plein, and more). These pills have no text imprint — they use logo stamps only, making the new `logo_description` field critical for matching.

### Changes

#### 1. Add `mdma_ecstasy` category to curated dataset (`supabase/functions/import-pill-data/index.ts`)
Add ~25-30 entries for the most common MDMA press logos with accurate physical data:

| Logo | Colors | Shapes | Size (mm) |
|------|--------|--------|-----------|
| Tesla T | Orange, Blue, Pink, Green | diamond/other | 10-12mm |
| Punisher skull | Various | other | 10-12mm |
| Superman S | Blue, Yellow, Red | diamond | 10-11mm |
| Philipp Plein skull | Various | round/other | 10-12mm |
| Red Bull | Various | other | 10-11mm |
| Mitsubishi | Various | round | 9-11mm |
| Rolls Royce | Various | round/other | 10-12mm |
| Domino | Various | rectangle | 10-12mm |

Key fields per entry:
- `imprint`: logo name (e.g., "TESLA", "PUNISHER") since these have no text
- `logo_description`: detailed stamp description (e.g., "Tesla T logo stamp", "Punisher skull face logo")
- `scoring`: `"none"` (pressed pills typically unscored)
- `size_mm`, `thickness_mm`: typical pressed pill dimensions
- `notes`: harm reduction warnings about unknown dosage and adulterants

#### 2. Add category to admin import UI (`src/components/admin/ApiImportTab.tsx`)
Add `{ value: "mdma_ecstasy", label: "MDMA / Ecstasy" }` to the CATEGORIES array so admins can import this category.

### Files changed
| File | Change |
|------|--------|
| `supabase/functions/import-pill-data/index.ts` | Add `mdma_ecstasy` key to `CURATED_DATA` with ~25-30 logo-only pill entries |
| `src/components/admin/ApiImportTab.tsx` | Add "MDMA / Ecstasy" to category dropdown |

### Notes
- These pills use the imprint field for the logo name since the deduplication key depends on it
- The `logo_description` field enables Pass 4 logo-based matching in the analyze-pill function
- No NDC codes for these (illicit substances), so no RxImage lookups
- After deployment, admin runs the import for the `mdma_ecstasy` category to populate the database

