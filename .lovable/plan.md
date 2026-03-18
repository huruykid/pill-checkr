

## Plan: Automated Feedback Tuning System

### Key Schema Observations

The `match_feedback` table has `report_id` and `match_id` columns but no `pill_id`. The `matches` table links to `pill_reference` via `drug_name` (not a direct FK). The reference table is `pill_reference`, not `reference_pills`. The RPC function will need to join `match_feedback` -> `matches` to group by match drug name (or matched pill identity).

Since there's no direct `pill_id` FK on `matches`, the most practical grouping is by `match_id` (each match row represents a specific pill reference match). We can then look up the corresponding `drug_name` from `matches` in the edge function.

---

### Part 1: SQL Migration

**New migration** adds:

1. **`requires_higher_confidence`** boolean column on `pill_reference` (default `false`, not null).

2. **`get_feedback_stats` RPC function** (security definer):
   - Parameter: `days_back` integer, default 7
   - Joins `match_feedback` to `matches` on `match_id`
   - Filters to last `days_back` days via `match_feedback.created_at`
   - Groups by `matches.drug_name`
   - Returns: `drug_name text`, `helpful_count bigint`, `unhelpful_count bigint`

### Part 2: Edge Function

**New file**: `supabase/functions/tune-confidence-scores/index.ts`

- CORS headers included
- Calls `get_feedback_stats` RPC with `days_back = 7`
- For each result where `(helpful_count + unhelpful_count) > 10` AND `unhelpful_count / total > 0.40`:
  - Updates all `pill_reference` rows with that `drug_name`, setting `requires_higher_confidence = true`
- Returns JSON summary of flagged pills
- Config: `verify_jwt = false` in `supabase/config.toml`

### Part 3: Admin UI Integration

**Update `src/pages/Admin.tsx`** — in the Pill References tab:

- Add a visual indicator (e.g., orange `AlertTriangle` icon + "Flagged" badge) next to pills where `requires_higher_confidence` is true
- The pill list already fetches all pill references; just need to read the new column and render the indicator

**Update `src/hooks/useI18n.tsx`** — add `"admin.flagged"` translation key.

### Files Changed

| File | Action |
|---|---|
| `supabase/migrations/[new].sql` | Add column + RPC function |
| `supabase/config.toml` | Add `tune-confidence-scores` function config |
| `supabase/functions/tune-confidence-scores/index.ts` | New edge function |
| `src/pages/Admin.tsx` | Add flagged indicator on pill cards |
| `src/hooks/useI18n.tsx` | Add translation key |

