

## Plan: Add More MDMA Press Logos to Reference Database

### What
Add ~20 new entries to the `mdma_ecstasy` category in `supabase/functions/import-pill-data/index.ts` for Versace, Louis Vuitton, Bitcoin, Givenchy, and other common press logos. Follows the exact same pattern as existing entries.

### Changes

**File: `supabase/functions/import-pill-data/index.ts`**

Insert new entries before the closing `],` of the `mdma_ecstasy` array (after line 838), adding these logos in multiple common color variants:

| Logo | Colors | Shape | Size | Logo Description |
|------|--------|-------|------|-----------------|
| Versace | Gold, Blue, Pink | round | 11mm | Versace Medusa head logo stamp |
| Louis Vuitton | Brown, Blue, Pink | round | 11mm | Louis Vuitton LV monogram logo stamp |
| Bitcoin | Orange, Gold, Blue | round | 10mm | Bitcoin B currency symbol logo stamp |
| Givenchy | Black, Blue, Pink | round | 11mm | Givenchy 4G logo stamp |
| Chanel | Pink, White, Black | round | 10mm | Chanel interlocking CC logo stamp |
| Fortnite | Purple, Blue | other | 11mm | Fortnite llama logo stamp |
| Skype | Blue, Green | round | 10mm | Skype S cloud logo stamp |
| Marshall | Orange, Purple | other | 12mm | Marshall amplifier script logo stamp |

Each entry uses the established format: `drug_name`, `imprint` (logo name), `shape`, `color`, harm reduction `notes`, `ndc_code: null`, physical dimensions, `scoring: "none"`, and `logo_description`.

No other files need changes — the admin UI already has the "MDMA / Ecstasy" category in the dropdown.

