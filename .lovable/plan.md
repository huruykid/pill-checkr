

## Plan: "One-Strike" Safety Threshold

### Problem
Currently, `calculateMatchScore` returns a single aggregate `score` via weighted addition. A pill with a perfect shape/color/size match but a badly mismatched imprint can still score "medium" or even "high" confidence because the other weights compensate. This is dangerous — a single weak critical metric should veto a high confidence result.

### Architecture

The one-strike logic applies in **two places**: the full-analysis path (line ~1166) and the quick-check path (line ~549). Both follow the same pattern.

### Changes

**`supabase/functions/analyze-pill/index.ts`**

1. **Expand `calculateMatchScore` return type** — Track individual metric ratios alongside the aggregate score:
   ```
   return { score, reasons, metricRatios: { imprint, shape, color, scoring } }
   ```
   Each ratio is 0–1: imprint earned / imprintExact weight, shape earned / shape weight, color earned / color weight, scoring earned / scoring weight. If a metric has no data to compare (e.g., no reference scoring), it returns `null` (not penalised).

2. **Add constants** at the top:
   ```
   const ONE_STRIKE_FLOOR = 0.65;    // any critical metric below this triggers the cap
   const ONE_STRIKE_MAX_SCORE = 40;  // hard cap on aggregate score (below "medium" threshold of 55)
   const ONE_STRIKE_MIN_ANOMALY = 80; // anomaly floor when triggered
   ```

3. **Apply one-strike logic after scoring, before confidence assignment** — In both the full-analysis path (~line 1167) and quick-check path (~line 549):
   ```
   if (topMatch && topMatch.metricRatios) {
     const dominated = Object.entries(topMatch.metricRatios)
       .filter(([_, v]) => v !== null && v < ONE_STRIKE_FLOOR);
     if (dominated.length > 0) {
       topMatch.score = Math.min(topMatch.score, ONE_STRIKE_MAX_SCORE);
       oneStrikeTriggered = true;
       oneStrikeReasons = dominated.map(([k, v]) => `${k} metric (${Math.round(v*100)}%) below safety floor`);
     }
   }
   ```

4. **Anomaly spike** — In the full-analysis path, after `calculateAnomalyScore` (line ~1182), if `oneStrikeTriggered`:
   ```
   anomalyScore = Math.max(anomalyScore, ONE_STRIKE_MIN_ANOMALY);
   anomalyReasons.push(...oneStrikeReasons, "One-strike safety threshold activated");
   ```
   In quick-check path, same logic for the inline anomaly values (line ~618).

5. **Confidence and risk cascade** — Because the score is capped at 40 (below the medium threshold of 55), `matchConfidence` will automatically resolve to `"low"`, and `deriveRiskLevel` with anomaly ≥ 80 will return `"high"` risk. No changes needed to those functions.

6. **Log the trigger** — Add a console.log when one-strike fires so it's visible in edge function logs.

### Effect on UI
- `matchConfidence: "low"` + `anomalyScore: ≥80` + `riskLevel: "high"` will trigger the existing high-risk/inconclusive warnings, red badges, and Narcan locator on the Results page. No front-end changes needed.

### Files Changed

| File | Action |
|---|---|
| `supabase/functions/analyze-pill/index.ts` | Add constants, expand `calculateMatchScore`, apply one-strike cap in both paths |

### Scope
- 1 file, ~40 lines added
- No database changes
- No new dependencies

