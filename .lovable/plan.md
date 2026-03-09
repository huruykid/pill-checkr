

# Visual Similarity Indicator on Results Page

## What We Have
The `analyze-pill` edge function already writes visual comparison data into the `match_reasons` text field on each match:
- `"Visual similarity: 85%"` — the similarity score
- `"Visual flags: rough edges, off-center imprint"` — specific red flags

This data is already returned to the frontend but displayed as plain text. We need to parse it and render a dedicated visual indicator.

## What We'll Build

For each match card in the Results page, add a **Visual Comparison Indicator** below the existing match details:

1. **When reference images were compared**: Show a small row with an eye/image icon, a colored similarity bar (green ≥70, yellow 40-69, red <40), the percentage, and any red flags as warning chips.

2. **When no reference images existed**: Show a muted "No reference image available" note so users understand the comparison wasn't possible.

## Implementation

### Modify `src/pages/Results.tsx`
- Create a helper function `parseVisualSimilarity(matchReasons: string)` that extracts the similarity percentage and red flags from the `match_reasons` string using regex.
- Inside each match card (lines 226-249), after the explanation text, render:
  - A small progress bar with the visual similarity score
  - An "Image Compared" or "No Reference Image" label with appropriate icon
  - Red flag chips if any visual concerns were detected

### No new files needed
This is a presentational change within the existing Results page. No database or edge function changes required — all data is already available in `match_reasons`.

### UI Design
Each match card gains a new row at the bottom:

```text
┌─────────────────────────────────────────────┐
│ 💊 Oxycodone 30mg (M 30)              High │
│ Imprint: M 30 • round • blue               │
│ Visual similarity: ██████████░░ 72%   ✓     │
│ ⚠ slight color variation                    │
└─────────────────────────────────────────────┘
```

When no visual comparison was done:
```text
│ 🖼 No reference image — visual comparison  │
│   not available for this match              │
```

