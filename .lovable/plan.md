

# Add Fentanyl Test Strip Banner to Education Page

## What
Add a prominent, visually distinct banner between the header and the SafetyChecklist on the Education page that highlights fentanyl test strip availability, their importance, and links to order them.

## Changes

### `src/pages/Education.tsx`
- Import `AlertTriangle` and `ExternalLink` from lucide-react
- Insert a styled banner after the header `<div>` (line 172) and before `<SafetyChecklist />` (line 175)
- Banner design:
  - Yellow/amber warning-style card with a bold icon and heading ("Fentanyl Test Strips Save Lives")
  - Short paragraph explaining that test strips can detect fentanyl in pills/powders and cost ~$1 each
  - "Order Test Strips" button linking to `https://dancesafe.org/product/fentanyl-test-strips-pack-of-10-free-shipping/` (opens in new tab)
  - Uses existing `Card`, `Button` components with warning/amber styling via Tailwind classes

Single file change, ~20 lines added.

