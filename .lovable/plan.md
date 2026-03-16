

## Plan: Plain-Language Risk Summary Card

### What
Add a prominent, color-coded summary card at the very top of the results (after the title/risk badge, before the pill photo) that gives a single plain-language sentence explaining what the analysis found. Green for low risk, yellow for medium, red for high. No percentages, no jargon.

### How

**File: `src/pages/Results.tsx`**

Insert a new summary card component between the heading area (line ~273) and the Emergency Bar (line ~276). The card will:

1. **Derive a plain-language message** from `riskLevel`, `matchConfidence`, top match `drug_name`, and `matches.length`:
   - **Low risk + high/medium confidence + matches**: "This pill looks consistent with [Drug Name]. Our reference database found matching characteristics."
   - **Medium risk or medium confidence**: "This pill partially matches [Drug Name], but some characteristics are inconsistent. Exercise caution."
   - **High risk or no matches**: "We couldn't confidently match this pill to any known reference. Treat it as high risk and do not consume without further testing."

2. **Color-coded card styling**:
   - Low: green border-left accent, light green background, CheckCircle icon
   - Medium: yellow/amber border-left accent, light warning background, AlertCircle icon
   - High: red border-left accent, light danger background, AlertTriangle icon

3. **Include a small subtext** reinforcing uncertainty: "This is not lab testing. Always use fentanyl test strips."

### Visual structure
```text
┌─────────────────────────────────────────┐
│ 🟢/🟡/🔴  Plain-language summary sentence │
│                                           │
│   "This pill looks consistent with..."    │
│   ─────────────────────────────────────   │
│   ⚠ This is not lab testing.             │
└─────────────────────────────────────────┘
```

### Single file change
Only `src/pages/Results.tsx` is modified. ~40 lines of new JSX inserted after line 273.

