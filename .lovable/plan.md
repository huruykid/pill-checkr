

## Plan: Full i18n Coverage Across All Pages and Components

### Scope Assessment

The current translation file (`useI18n.tsx`) has ~55 keys covering Results page sections, harm reduction steps, emergency bar, and harm reduction resources. However, the following pages and components have **extensive hardcoded English**:

**Pages with hardcoded strings:**
- **Index.tsx** (~30 strings): hero title, subtitle, "How It Works" section, feature list, button labels
- **CheckPill.tsx** (~40 strings): mode toggle labels, photo tips, form labels, placeholders, error messages, progress steps, quality feedback panel
- **Results.tsx** (~25 strings): risk summary sentences, section headers like "Possible Matches", "Inconsistency Score", "Match Breakdown", share UI, loading states
- **History.tsx** (~15 strings): page title, empty state, "Clear All", sign-in prompt, "Inconsistency" label
- **Education.tsx** (~10 strings): page title, "Articles" header, test strip banner, "Back to Articles"
- **Header.tsx** (~10 strings): nav link labels ("Check a Pill", "History", "Learn", etc.), "Sign In", "Sign Out", "Settings"
- **Footer.tsx** (~8 strings): brand description, quick links, emergency section
- **Disclaimer.tsx** (~8 strings): all three variants (default, compact, emergency)
- **EmergencyFAB.tsx** (~6 strings): line labels, descriptions, footer text
- **CounterfeitWarning.tsx** (~5 strings): title and bullet points

**Total: ~160 new translation keys needed across EN/ES/FR/PT.**

### How

This is a large but mechanical change across two areas:

**1. Expand translations in `src/hooks/useI18n.tsx`**
Add ~160 new keys organized by prefix:
- `nav.*` — Header nav labels, auth buttons
- `index.*` — Homepage hero, how-it-works, features
- `check.*` — CheckPill form labels, mode toggle, photo tips, progress steps, errors, quality feedback
- `results.summary.*` — Plain-language risk summary sentences
- `results.share.*` — Share UI strings
- `history.*` — History page strings
- `edu.*` — Education page strings
- `disclaimer.*` — All disclaimer variants
- `fab.*` — EmergencyFAB strings
- `footer.*` — Footer strings
- `counterfeit.*` — CounterfeitWarning strings
- `common.*` — Shared strings like "Loading...", "Sign in", "Back"

All four languages (EN, ES, FR, PT) get complete translations for every key.

**2. Replace hardcoded strings in components**
Each file listed above gets `useI18n()` imported (if not already) and every English string replaced with `t("key.name")`. For components that don't use hooks (like static arrays), the arrays move inside the component body after the `t()` call.

### File changes
- `src/hooks/useI18n.tsx` — Add ~160 keys × 4 languages
- `src/pages/Index.tsx` — Replace ~30 strings
- `src/pages/CheckPill.tsx` — Replace ~40 strings
- `src/pages/Results.tsx` — Replace ~25 strings
- `src/pages/History.tsx` — Replace ~15 strings
- `src/pages/Education.tsx` — Replace ~10 strings
- `src/components/layout/Header.tsx` — Replace ~10 strings
- `src/components/layout/Footer.tsx` — Replace ~8 strings
- `src/components/shared/Disclaimer.tsx` — Replace ~8 strings
- `src/components/shared/EmergencyFAB.tsx` — Replace ~6 strings
- `src/components/shared/CounterfeitWarning.tsx` — Replace ~5 strings

### Notes
- Education post content (title, body, summary) comes from the database and won't be translated by this change — that would require a separate content localization strategy.
- The `SHAPES`, `COLORS`, and `SCORINGS` arrays in CheckPill will be translated so dropdown options display in the user's language.
- SEO meta tags (title/description in `<SEOHead>`) will remain in English since search engines index the primary language. A future enhancement could add `hreflang` tags.

