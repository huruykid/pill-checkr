

## Plan: Add Size & Scoring to Pill Identification

### Problem
With 236 pills in the database, many share similar imprints, shapes, and colors. Adding size dimensions and scoring pattern as identification features will significantly improve match accuracy and counterfeit detection.

### Changes

#### 1. Database Migration
Add columns to `pill_reference`:
- `size_mm` (numeric, nullable) — diameter or length in mm
- `thickness_mm` (numeric, nullable)  
- `scoring` (enum: 'none', 'single', 'double', 'quad', 'other')

Add columns to `reports`:
- `estimated_size_mm` (numeric, nullable)
- `scoring` (same enum)

#### 2. Update Analyze-Pill Edge Function
- Add `scoring` and `estimatedSizeMm` to the input schema
- Have the AI extract scoring pattern from the photo
- Add match scoring weights: scoring match (+10), size within 1mm tolerance (+10)
- Update anomaly scoring: flag size deviations > 2mm as suspicious

#### 3. Update CheckPill Page
- Add optional "Scoring" dropdown (None / Single line / Cross / Other)
- Add optional "Size" input with helper text ("Place next to a coin for scale")

#### 4. Update Results Page
- Add scoring match and size deviation to the match breakdown progress bars
- Show size comparison when reference data is available

#### 5. Update Match Weights
```text
Current:  imprint(50) + shape(15) + color(15) + visual(30) = 110 max
Proposed: imprint(45) + shape(12) + color(12) + scoring(8) + size(8) + visual(25) = 110 max
```

### Technical Notes
- Scoring enum migration: `CREATE TYPE pill_scoring AS ENUM ('none', 'single', 'double', 'quad', 'other')`
- Size matching uses tolerance-based scoring: exact ±0.5mm = full points, ±1mm = half, >2mm = anomaly flag
- Backward compatible — all new fields nullable, existing pills without size/scoring data still match normally

