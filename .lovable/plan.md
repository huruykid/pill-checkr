

# Why Adderall Wasn't Found — Investigation & Fix

## Root Cause

Two issues combined:

1. **Tiny reference database**: Only **97 total entries**, with just **one Adderall variant** (`AD 30`, orange, round). Generic amphetamine comes in dozens of manufacturer variants (dp 30, b 974, E 404, u30, etc.) — none of which are in the database.

2. **Imprint-only search with no fallback**: The matching query (line 407-410) filters exclusively by `ilike("imprint", ...)`. If the AI reads "dp 30" from a generic Adderall but the DB only has "AD 30", the `%dp 30%` filter returns zero rows. The function never tries a broader search.

## Fix: Two-Pass Matching with Shape/Color Fallback

Update `analyze-pill/index.ts` Step 2 to use a two-pass approach:

1. **Pass 1**: Search by imprint (current behavior)
2. **Pass 2**: If Pass 1 returns fewer than 3 results, run a broader query matching by shape + color (no imprint filter), then merge and deduplicate

This ensures pills with the right physical characteristics still surface even when the imprint text doesn't match any reference.

```text
Pass 1: ilike imprint → matches?
         ├── Yes (≥3) → proceed with scoring
         └── No/few → Pass 2: query by shape + color
                       → merge, deduplicate, score all
```

## Additionally: Seed More Amphetamine/Adderall Variants

Add common generic amphetamine imprints to the curated dataset via the existing import function. This is a data gap — the most commonly prescribed stimulant in the US should have better coverage. This would be done by expanding the curated dataset categories in `import-pill-data/index.ts` to include more generic manufacturer variants for stimulants.

## Changes

1. **`supabase/functions/analyze-pill/index.ts`** — Add fallback query when imprint search returns < 3 results: query `pill_reference` by shape and/or color, merge with imprint results, deduplicate by `id`
2. **`supabase/functions/import-pill-data/index.ts`** — Add more generic amphetamine variants (dp 30, b 974, E 404, u30, cor 136, etc.) to the stimulants curated dataset

