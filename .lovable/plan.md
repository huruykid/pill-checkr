

## Test Results: Bugs Found

### Testing Summary
I ran an end-to-end quick check with imprint "M30", shape "Round", color "Blue". The analysis completed and a report was created in the database (`aef42c43...`), but the app showed **"Report not found"** and redirected back to the Check page.

### Root Cause: Anonymous Reports Are Invisible (Pre-existing Bug)

The `reports` table RLS SELECT policies require either:
- `auth.uid() = user_id` (authenticated user owns it), OR
- `user_id IS NULL AND shared = true` (anonymous + shared)

But both report insert paths in `analyze-pill/index.ts` (quick-check at line 641 and full-analysis at line 1259) **never set `shared`**, so it defaults to `false`. This means:
- Anonymous reports are created successfully ✅
- Anonymous reports can never be read back ❌ → "Report not found"

This blocks testing the test strip logging flow entirely, since you can't reach the Results page.

### Fix Plan

**1. `supabase/functions/analyze-pill/index.ts`** — Set `shared: true` for anonymous reports

In both insert blocks (lines ~641 and ~1259), add:
```
shared: !userId,  // anonymous reports must be shared to be readable
```

This ensures anonymous reports are visible via the existing `user_id IS NULL AND shared = true` RLS policy while authenticated users' reports remain private by default.

**2. Fix existing orphaned report** — Update the report we just created so we can proceed with testing:
```sql
UPDATE reports SET shared = true WHERE user_id IS NULL AND shared = false;
```

### After the Fix
Once anonymous reports are readable, the full test strip flow can be tested:
1. Quick check → Results page loads ✅
2. Click test strip button (Negative/Positive/Invalid) → writes to `test_strip_results` ✅  
3. Navigate to History → see the indicator ✅

### Files Changed

| File | Action |
|---|---|
| `supabase/functions/analyze-pill/index.ts` | Add `shared: !userId` to both insert blocks |

### Scope
- 1 file, 2 lines changed
- 1 SQL update for existing data
- No schema changes

