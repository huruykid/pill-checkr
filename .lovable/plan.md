

## Plan: Color Proximity Scoring + Back-Image Imprint Extraction

### File: `supabase/functions/analyze-pill/index.ts`

#### Change 1: Color Proximity Map and Partial Scoring

Add a color similarity map above `calculateMatchScore` that defines which colors are "close" and awards partial credit (e.g., 6 of 12 points) instead of 0.

Color proximity groups:
- pink ↔ red (close)
- blue ↔ purple (close)
- orange ↔ yellow, orange ↔ red (close)
- tan ↔ brown, tan ↔ yellow (close)
- gray ↔ white (close)
- green ↔ yellow (distant, smaller bonus)

Implementation: A `COLOR_PROXIMITY` map of `Record<string, Record<string, number>>` where values are partial scores (0-1 scale). In `calculateMatchScore`, when colors don't match exactly, look up the proximity value and award `MATCH_WEIGHTS.color * proximityValue` (e.g., 0.5 = 6 points). Add a reason like "Color similar (pink ≈ red)".

Also apply the same logic in `calculateAnomalyScore` — skip the color mismatch penalty (+15) when colors are proximate.

#### Change 2: Back-Image Imprint Extraction

Currently the AI prompt sends both images but only extracts a single `extracted_imprint`. Update the AI system prompt to also extract `back_imprint` — text found on the reverse side.

Then in the matching logic (line ~481), combine front and back imprints: if both exist, concatenate them (e.g., `"M30"` front + `"OP"` back → search for both). Use the back imprint as a secondary search term in Pass 1 if it differs from the front imprint.

Specific changes:
- Update AI prompt JSON schema to include `"back_imprint": "text on back or null"` and `"back_imprint_confidence": "high|medium|low"`
- After extraction, set `finalBackImprint` from user input or AI extraction
- In Pass 1, if `finalBackImprint` exists and differs from `finalImprint`, run an additional `ilike` query on it and merge results
- Include back imprint in the `calculateMatchScore` extracted object — check if either front or back imprint matches the reference

### Summary of edits

| Location | What |
|----------|------|
| Lines ~26-37 | Add `COLOR_PROXIMITY` map |
| Lines 52-115 | Update `calculateMatchScore`: add color proximity partial scoring, add thickness_mm weight |
| Lines 118-193 | Update `calculateAnomalyScore`: skip color penalty for proximate colors |
| Lines 386-436 | Update AI prompt to extract `back_imprint` |
| Lines 478-510 | Merge back imprint into matching, run additional Pass 1 query |

