

## Plan: Narcan/Naloxone Locator Button on Results Page

### What
Add a prominent "Find Narcan Near You" call-to-action card on the Results page when the pill is flagged as high risk or unmatched. The button links to `/nearby-help?filter=naloxone`, leveraging the existing filter support in the Nearby Help Map page.

### How

**File: `src/pages/Results.tsx`**

Insert a new card directly after the plain-language risk summary (line ~319) when `riskLevel === "high"` or `matches.length === 0`. The card will:

- Use a red/orange accent style consistent with the danger theme
- Show a MapPin icon + "Find Narcan Near You" heading + brief context line ("Naloxone can reverse an opioid overdose. Find free Narcan near you.")
- Link button navigates to `/nearby-help?filter=naloxone`
- Uses `react-router-dom` `Link` (already imported)

**File: `src/hooks/useI18n.tsx`**

Add 4 new translation keys for EN/ES/FR/PT:
- `results.narcan.title` — "Find Narcan Near You"
- `results.narcan.description` — "Naloxone can reverse an opioid overdose..."
- `results.narcan.button` — "Find Naloxone Nearby"

### Scope
- ~15 lines of new JSX in Results.tsx
- ~4 new i18n keys × 4 languages in useI18n.tsx
- No new files or dependencies

