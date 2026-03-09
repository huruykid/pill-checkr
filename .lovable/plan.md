

# Add Visual Image Comparison to Pill Analysis

## Current State
- AI reads the uploaded photo to extract imprint text, shape, and color (OCR)
- Matching is purely text-based: imprint string `ilike` query against `pill_reference`
- `pill_reference_images` table exists with `pill_reference_id`, `image_url`, and `source` columns but is **never queried during analysis**

## Proposed Enhancement

### How It Would Work
After the current text-based matching finds the top 3 candidates from `pill_reference`, we fetch their reference images from `pill_reference_images` and send them to the AI model alongside the user's photo for a **visual comparison**. The AI can then assess:
- Font style/quality of imprint text (counterfeits often have wrong fonts)
- Color shade accuracy
- Scoring line patterns (break lines on pill)
- Size/proportion consistency
- Surface texture differences
- Overall visual similarity score

### Implementation

**1. Modify `analyze-pill/index.ts`:**
- After scoring text matches (line ~334), query `pill_reference_images` for the top matches' `pill_reference_id`s
- Add a second AI call that includes:
  - The user's uploaded image
  - Up to 3 reference images from the database
  - Prompt asking for visual similarity assessment per reference
- Incorporate the visual similarity score into the final match ranking and anomaly detection

**2. Second AI prompt design:**
```
Compare the user's pill photo against these reference images of known legitimate pills.
For each reference, assess:
- Visual similarity (0-100)
- Font/imprint style match
- Color shade accuracy  
- Shape/proportion match
- Any visual red flags (rough edges, uneven coloring, off-center imprint)
```

**3. Update scoring:**
- Add a `MATCH_WEIGHTS.visualSimilarity` weight (e.g., 30 points)
- Visual mismatch increases `anomalyScore` (strong counterfeit signal)
- If reference images exist but visual similarity is low despite text match → flag as suspicious

**4. Populate reference images:**
- The `pill_reference_images` table needs actual image URLs
- Option A: Add curated image URLs to the `import-pill-data` function for high-risk pills
- Option B: Link to FDA RxImage API URLs or DailyMed pill images
- Start with the ~50 HIGH COUNTERFEIT RISK pills as priority

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/analyze-pill/index.ts` | Add reference image fetch + visual comparison AI call + updated scoring |
| `supabase/functions/import-pill-data/index.ts` | Add `images` field to curated data entries with public pill image URLs |

### Trade-offs
- **Cost**: Adds a second AI call per analysis (~doubles inference cost)
- **Latency**: Additional ~2-3 seconds for the visual comparison step
- **Coverage**: Only works for pills that have reference images in the database — falls back to current text-only matching otherwise
- **Accuracy gain**: Significant for counterfeit detection — text matching alone cannot catch visual differences that are the primary indicator of fakes

