

## Plan: All Five Improvements

### 1. Add thickness_mm to match scoring
**File:** `supabase/functions/analyze-pill/index.ts`
- Add `thickness: 6` to `MATCH_WEIGHTS` (new max ~121)
- In `calculateMatchScore`, after size matching, add thickness comparison: exact (±0.3mm) = 6pts, close (±0.6mm) = 3pts
- Update `CONFIDENCE_THRESHOLDS` proportionally (high: 85, medium: 55)

### 2. Add GIN trigram index on pill_reference.imprint
**Database migration:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pill_reference_imprint_trgm
ON public.pill_reference USING gin (imprint gin_trgm_ops);
```
This speeds up the `fuzzy_imprint_search` function as the reference table grows.

### 3. PWA with offline caching
- Install `vite-plugin-pwa`
- Configure in `vite.config.ts` with manifest, icons, and workbox settings (precache education page shell, safety checklist)
- Add `navigateFallbackDenylist: [/^\/~oauth/]`
- Add mobile meta tags to `index.html`
- Create `/install` page with install prompt trigger
- Add route in `App.tsx`

### 4. Shareable results links with privacy controls
- Results already have shareable URLs (`/results/:reportId`), but anonymous reports with `user_id IS NULL` are viewable by anyone while authenticated reports are restricted to owner
- Add a `shared` boolean column to `reports` table (default false)
- Add RLS policy: allow SELECT when `shared = true` (for anyone)
- Add a "Share" button on Results page that sets `shared = true` and copies the URL
- Add an "Unshare" button to revoke access

**Database migration:**
```sql
ALTER TABLE public.reports ADD COLUMN shared boolean NOT NULL DEFAULT false;
CREATE POLICY "Anyone can view shared reports" ON public.reports
  FOR SELECT TO public USING (shared = true);
```

**Files:** `src/pages/Results.tsx` — add Share/Unshare toggle button with copy-to-clipboard

### 5. Expand i18n to French and Portuguese
**File:** `src/hooks/useI18n.tsx`
- Add `"fr"` and `"pt"` to the `Language` type
- Add full translation objects for French and Portuguese (all existing keys)
- Update language toggle in Header to cycle through EN → ES → FR → PT or use a dropdown select

**File:** `src/components/layout/Header.tsx`
- Replace the simple toggle button with a small dropdown or cycle button for 4 languages

### Summary of changes

| Change | Files |
|--------|-------|
| Thickness scoring | `analyze-pill/index.ts` |
| GIN trigram index | New migration |
| PWA | `vite.config.ts`, `index.html`, new Install page, `App.tsx`, `package.json` |
| Shareable results | New migration, `Results.tsx` |
| i18n expansion | `useI18n.tsx`, `Header.tsx` |

